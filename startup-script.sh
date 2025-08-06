#!/bin/bash
# Script de inicio para la VM de los workers y Redis
echo "Hellooo"
# --- Configuración ---
# Obtiene los secretos de Google Secret Manager. Esta es la forma segura.
# Los nombres de las variables coinciden con los de app/core/config.py
export DATABASE_URL=$(gcloud secrets versions access latest --secret="db-url")
export GOOGLE_API_KEY=$(gcloud secrets versions access latest --secret="google-api-key")
export GOOGLE_GEMINI_API_KEY=$(gcloud secrets versions access latest --secret="google-gemini-api-key")
export GOOGLE_SEARCH_ENGINE_ID=$(gcloud secrets versions access latest --secret="google-search-engine-id")
export JWT_SECRET=$(gcloud secrets versions access latest --secret="jwt-secret")
export JWT_ALGORITHM="HS256"
export ENVIRONMENT="production"

# Configuración de Redis para los workers (se comunican por la red de Docker)
export REDIS_HOST="redis"
export REDIS_PORT="6379"

# Número de workers de análisis a ejecutar
NUM_ANALYSIS_WORKERS=3

# --- Información del Proyecto e Imagen ---
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
WORKER_IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/listing-fraud-repo/listing-fraud-worker:latest"

# --- Instalar Docker y Autenticación ---
apt-get update
apt-get install -y docker.io
gcloud auth configure-docker ${REGION}-docker.pkg.dev -q

# --- Configurar Red de Docker ---
docker network create fraud-net || true

# --- Ejecutar Contenedor de Redis ---
docker run -d --name redis --network fraud-net -p 6379:6379 --restart always redis:alpine

# --- Obtener la Última Imagen del Worker ---
docker pull $WORKER_IMAGE_URI

# --- Ejecutar Migraciones de la Base de Datos ---
echo "Ejecutando migraciones de la base de datos..."
docker run --rm --name alembic-migration --network fraud-net \
    -e DATABASE_URL="$DATABASE_URL" \
    -e GOOGLE_API_KEY="$GOOGLE_API_KEY" \
    -e GOOGLE_GEMINI_API_KEY="$GOOGLE_GEMINI_API_KEY" \
    -e GOOGLE_SEARCH_ENGINE_ID="$GOOGLE_SEARCH_ENGINE_ID" \
    -e JWT_SECRET="$JWT_SECRET" \
    -e JWT_ALGORITHM="$JWT_ALGORITHM" \
    -e ENVIRONMENT="$ENVIRONMENT" \
    -e REDIS_HOST="$REDIS_HOST" \
    -e REDIS_PORT="$REDIS_PORT" \
    $WORKER_IMAGE_URI alembic -x db_url="$DATABASE_URL" upgrade head

# --- Ejecutar Contenedores de los Workers ---
echo "Iniciando $NUM_ANALYSIS_WORKERS workers de análisis..."
for i in $(seq 1 $NUM_ANALYSIS_WORKERS)
do
  echo "Iniciando worker analysis-worker-$i..."
  docker stop "analysis-worker-$i" || true && docker rm "analysis-worker-$i" || true
  docker run -d --name "analysis-worker-$i" --network fraud-net --restart always \
      -e DATABASE_URL="$DATABASE_URL" \
      -e REDIS_HOST="$REDIS_HOST" \
      -e REDIS_PORT="$REDIS_PORT" \
      -e GOOGLE_API_KEY="$GOOGLE_API_KEY" \
      -e GOOGLE_GEMINI_API_KEY="$GOOGLE_GEMINI_API_KEY" \
      -e GOOGLE_SEARCH_ENGINE_ID="$GOOGLE_SEARCH_ENGINE_ID" \
      -e JWT_SECRET="$JWT_SECRET" \
      -e JWT_ALGORITHM="$JWT_ALGORITHM" \
      -e ENVIRONMENT="$ENVIRONMENT" \
      $WORKER_IMAGE_URI python analysis_worker.py
done

echo "Script de inicio finalizado."