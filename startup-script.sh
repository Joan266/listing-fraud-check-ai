#!/bin/bash
# SafeLease Worker Deployment Script - Final v9.2
echo "--- Starting Production Deployment v9.2 ---"

# --- Fail on errors and log everything ---
set -eo pipefail
exec > >(tee -a /var/log/startup-script.log) 2>&1

# --- Configuration ---
echo "--- Fetching secrets and configuring environment ---"
DB_USER=$(gcloud secrets versions access latest --secret="db_user")
DB_PASS=$(gcloud secrets versions access latest --secret="db_pass")
DB_NAME="safelease-db"
export GOOGLE_API_KEY=$(gcloud secrets versions access latest --secret="google-api-key")
export GOOGLE_GEMINI_API_KEY=$(gcloud secrets versions access latest --secret="google-gemini-api-key")
export Google Search_ENGINE_ID=$(gcloud secrets versions access latest --secret="google-search-engine-id")
export JWT_SECRET=$(gcloud secrets versions access latest --secret="jwt-secret")
export JWT_ALGORITHM="HS256"
export ENVIRONMENT="production"

# --- Project Info ---
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
WORKER_IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/listing-fraud-repo/listing-fraud-worker:latest"
CLOUD_SQL_CONNECTION_NAME="${PROJECT_ID}:${REGION}:safelease-db"

# --- Database URL ---
export DATABASE_URL="postgresql+psycopg2://${DB_USER}:${DB_PASS}@cloud-sql-proxy:5432/${DB_NAME}"
echo "--- DATABASE_URL is set for upcoming steps ---"

# --- Install Docker & Fix Permissions ---
echo "--- Installing Docker and setting permissions ---"
apt-get update && apt-get install -y docker.io
systemctl enable docker && systemctl start docker
# Add the current user to the docker group to avoid permission errors
usermod -aG docker $(whoami)
gcloud auth configure-docker ${REGION}-docker.pkg.dev -q

# --- Create Network ---
echo "--- Creating Docker Network 'fraud-net' ---"
docker network create fraud-net || true

# --- Start Redis ---
echo "--- Starting Redis container ---"
docker run -d --name redis --network fraud-net --restart always \
  --memory=512m --cpus=0.5 \
  redis:alpine

# --- Start Cloud SQL Proxy (Corrected) ---
echo "--- Starting Cloud SQL Proxy to listen on all network interfaces ---"
docker run -d --name cloud-sql-proxy --network fraud-net --restart always \
  gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.2 \
  --structured-logs \
  --port 5432 \
  --address 0.0.0.0 \
  --health-check \
  --http-port 9090 \
  --http-address 0.0.0.0 \
  "$CLOUD_SQL_CONNECTION_NAME"

# --- Wait for Proxy ---
echo "--- Waiting for Cloud SQL Proxy to be ready ---"
MAX_RETRIES=12
SLEEP_INTERVAL=5
for i in $(seq 1 $MAX_RETRIES); do
  # Use a temporary curl container to check the proxy's readiness endpoint
  if docker run --rm --network fraud-net curlimages/curl:8.4.0 --fail --silent --max-time 4 http://cloud-sql-proxy:9090/readiness; then
    echo "--- Cloud SQL Proxy is ready! ---"
    break
  fi
  echo "Attempt $i/$MAX_RETRIES: Proxy not ready, waiting $SLEEP_INTERVAL seconds..."
  sleep $SLEEP_INTERVAL
  if [ $i -eq $MAX_RETRIES ]; then
    echo "ERROR: Cloud SQL Proxy failed to start in time. Aborting."
    exit 1
  fi
done

# --- Database Initialization (Corrected) ---
echo "--- Initializing Database Schema ---"
# Note: The psql commands might show a "no password supplied" error, which is non-fatal.
# The important steps (SQLAlchemy create_all and Alembic upgrade) will succeed.

# 1. Create essential extensions
docker run --rm --network fraud-net postgres:16-alpine \
  psql "postgresql://${DB_USER}:${DB_PASS}@cloud-sql-proxy:5432/${DB_NAME}" -c \
  "CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" || echo "psql command for extensions finished."

# 2. Grant privileges
docker run --rm --network fraud-net postgres:16-alpine \
  psql "postgresql://${DB_USER}:${DB_PASS}@cloud-sql-proxy:5432/${DB_NAME}" -c \
  "GRANT ALL PRIVILEGES ON SCHEMA public TO ${DB_USER}; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER}; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};" || echo "psql command for privileges finished."

# 3. Create tables using SQLAlchemy (passing in all necessary env vars)
docker run --rm --name schema-init --network fraud-net \
  -e DATABASE_URL="$DATABASE_URL" \
  -e GOOGLE_API_KEY="$GOOGLE_API_KEY" \
  -e GOOGLE_GEMINI_API_KEY="$GOOGLE_GEMINI_API_KEY" \
  -e Google Search_ENGINE_ID="$Google Search_ENGINE_ID" \
  $WORKER_IMAGE_URI python -c "
from app.db.session import engine;
from app.db import models;
models.Base.metadata.create_all(bind=engine);
print('SQLAlchemy schema creation successful.')
"

# 4. Run migrations (passing in all necessary env vars)
echo "--- Running Database Migrations ---"
docker run --rm --name alembic-migration --network fraud-net \
  -e DATABASE_URL="$DATABASE_URL" \
  -e GOOGLE_API_KEY="$GOOGLE_API_KEY" \
  -e GOOGLE_GEMINI_API_KEY="$GOOGLE_GEMINI_API_KEY" \
  -e Google Search_ENGINE_ID="$Google Search_ENGINE_ID" \
  $WORKER_IMAGE_URI alembic upgrade head

# --- Start Workers ---
NUM_WORKERS=3
echo "--- Starting $NUM_WORKERS Analysis Workers ---"
for i in $(seq 1 $NUM_WORKERS); do
  echo "Starting worker analysis-worker-$i..."
  docker run -d --name "analysis-worker-$i" --network fraud-net --restart always \
    --memory=1g --cpus=1 \
    -e DATABASE_URL="$DATABASE_URL" \
    -e REDIS_HOST="redis" \
    -e REDIS_PORT="6379" \
    -e GOOGLE_API_KEY="$GOOGLE_API_KEY" \
    -e GOOGLE_GEMINI_API_KEY="$GOOGLE_GEMINI_API_KEY" \
    -e Google Search_ENGINE_ID="$Google Search_ENGINE_ID" \
    -e JWT_SECRET="$JWT_SECRET" \
    -e JWT_ALGORITHM="$JWT_ALGORITHM" \
    -e ENVIRONMENT="$ENVIRONMENT" \
    $WORKER_IMAGE_URI python analysis_worker.py
done

# --- Verify Deployment ---
echo "--- Verifying Final Deployment Status ---"
docker ps -a
echo "================================================="
echo "--- DEPLOYMENT SCRIPT COMPLETED SUCCESSFULLY ---"
echo "================================================="