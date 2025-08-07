#!/bin/bash
# SafeLease Worker Deployment Script - Final v9.1
echo "--- Starting Production Deployment v9.1 ---"

# --- Fail on errors and log everything ---
set -eo pipefail
exec > >(tee -a /var/log/startup-script.log) 2>&1

# --- Configuration ---
DB_USER=$(gcloud secrets versions access latest --secret="db_user")
DB_PASS=$(gcloud secrets versions access latest --secret="db_pass")
DB_NAME="safelease-db"  # Explicitly using your application database
export GOOGLE_API_KEY=$(gcloud secrets versions access latest --secret="google-api-key")
export GOOGLE_GEMINI_API_KEY=$(gcloud secrets versions access latest --secret="google-gemini-api-key")
export GOOGLE_SEARCH_ENGINE_ID=$(gcloud secrets versions access latest --secret="google-search-engine-id")
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
echo "--- Using DATABASE_URL: postgresql+psycopg2://${DB_USER}:********@cloud-sql-proxy:5432/${DB_NAME} ---"

# --- Install Docker ---
echo "--- Installing Docker ---"
apt-get update && apt-get install -y docker.io
systemctl enable docker && systemctl start docker
gcloud auth configure-docker ${REGION}-docker.pkg.dev -q

# --- Create Network ---
echo "--- Creating Docker Network ---"
docker network create fraud-net || true

# --- Start Redis ---
echo "--- Starting Redis ---"
docker run -d --name redis --network fraud-net --restart always \
  --memory=512m --cpus=0.5 \
  redis:alpine

# --- Start Cloud SQL Proxy ---
echo "--- Starting Cloud SQL Proxy ---"
docker run -d --name cloud-sql-proxy --network fraud-net --restart always \
  gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.2 \
  --structured-logs \
  --port 5432 \
  --health-check \
  --http-port 9090 \
  --http-address 0.0.0.0 \
  "$CLOUD_SQL_CONNECTION_NAME"

# --- Wait for Proxy ---
echo "--- Waiting for Cloud SQL Proxy ---"
MAX_RETRIES=12
SLEEP_INTERVAL=5
for i in $(seq 1 $MAX_RETRIES); do
  if docker run --rm --network fraud-net curlimages/curl:8.4.0 \
    --fail --silent --max-time 4 http://cloud-sql-proxy:9090/readiness; then
    echo "--- Cloud SQL Proxy is ready! ---"
    break
  fi
  echo "Attempt $i/$MAX_RETRIES: Proxy not ready, waiting $SLEEP_INTERVAL seconds..."
  sleep $SLEEP_INTERVAL
  if [ $i -eq $MAX_RETRIES ]; then
    echo "ERROR: Cloud SQL Proxy failed to start"
    exit 1
  fi
done

# --- Database Initialization ---
echo "--- Initializing Database Schema ---"

# 1. Create essential extensions
docker run --rm --network fraud-net postgres:16-alpine \
  psql "$DATABASE_URL" -c \
  "CREATE EXTENSION IF NOT EXISTS pgcrypto;
   CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# 2. Grant privileges explicitly (CRITICAL: Before table creation)
docker run --rm --network fraud-net postgres:16-alpine \
  psql "$DATABASE_URL" -c \
  "GRANT ALL PRIVILEGES ON SCHEMA public TO ${DB_USER};
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};"

# 3. Create tables using SQLAlchemy
docker run --rm --name schema-init --network fraud-net \
  -e DATABASE_URL="$DATABASE_URL" \
  $WORKER_IMAGE_URI python -c "
from app.db.session import engine
from app.db import models
models.Base.metadata.create_all(bind=engine)
print('Schema created successfully in safelease-db')
"

# 4. Run migrations
echo "--- Running Database Migrations ---"
docker run --rm --name alembic-migration --network fraud-net \
  -e DATABASE_URL="$DATABASE_URL" \
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
    -e GOOGLE_SEARCH_ENGINE_ID="$GOOGLE_SEARCH_ENGINE_ID" \
    -e JWT_SECRET="$JWT_SECRET" \
    -e JWT_ALGORITHM="$JWT_ALGORITHM" \
    -e ENVIRONMENT="$ENVIRONMENT" \
    $WORKER_IMAGE_URI python analysis_worker.py
done

# --- Verify Deployment ---
echo "--- Verifying Deployment ---"
docker ps -a
echo "--- Checking Worker Status ---"
for i in $(seq 1 $NUM_WORKERS); do
  if ! docker ps | grep -q "analysis-worker-$i"; then
    echo "ERROR: Worker analysis-worker-$i is not running!"
    exit 1
  fi
done

echo "================================================="
echo "--- DEPLOYMENT COMPLETED SUCCESSFULLY ---"
echo "================================================="