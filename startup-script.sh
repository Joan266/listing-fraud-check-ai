#!/bin/bash
# Script de inicio para la VM de los workers y Redis - Versión Final 8.1
echo "--- Iniciando script de despliegue v8.1 (solución definitiva) ---"

# --- Fail on errors and log everything ---
set -eo pipefail
exec > >(tee -a /var/log/startup-script.log) 2>&1

# --- Configuración ---
DB_USER=$(gcloud secrets versions access latest --secret="db_user")
DB_PASS=$(gcloud secrets versions access latest --secret="db_pass")
DB_NAME=$(gcloud secrets versions access latest --secret="db_name")
export GOOGLE_API_KEY=$(gcloud secrets versions access latest --secret="google-api-key")
export GOOGLE_GEMINI_API_KEY=$(gcloud secrets versions access latest --secret="google-gemini-api-key")
export GOOGLE_SEARCH_ENGINE_ID=$(gcloud secrets versions access latest --secret="google-search-engine-id")
export JWT_SECRET=$(gcloud secrets versions access latest --secret="jwt-secret")
export JWT_ALGORITHM="HS256"
export ENVIRONMENT="production"

# --- Información del Proyecto e Imagen ---
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
WORKER_IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/listing-fraud-repo/listing-fraud-worker:latest"
CLOUD_SQL_CONNECTION_NAME="${PROJECT_ID}:${REGION}:safelease-db"

# --- Construcción de la DATABASE_URL ---
export DATABASE_URL="postgresql+psycopg2://${DB_USER}:${DB_PASS}@cloud-sql-proxy:5432/${DB_NAME}"

echo "--- DATABASE_URL para los contenedores: postgresql+psycopg2://${DB_USER}:********@cloud-sql-proxy:5432/${DB_NAME} ---"

# --- Instalar Docker y Autenticación ---
echo "--- Instalando Docker ---"
apt-get update
apt-get install -y docker.io
systemctl enable docker
systemctl start docker
gcloud auth configure-docker ${REGION}-docker.pkg.dev -q

# --- Configurar Red de Docker ---
echo "--- Configurando red Docker ---"
docker network create fraud-net || echo "La red 'fraud-net' ya existe."

# --- Limpieza de contenedores antiguos ---
echo "--- Limpiando contenedores antiguos ---"
for container in redis cloud-sql-proxy alembic-migration analysis-worker-1 analysis-worker-2 analysis-worker-3; do
  docker stop $container || true
  docker rm $container || true
done

# --- Ejecutar Contenedores de Soporte ---
echo "--- Iniciando servicios de soporte ---"
docker run -d --name redis --network fraud-net --restart always \
  --memory=512m --cpus=0.5 \
  redis:alpine

echo "--- Iniciando Cloud SQL Proxy ---"
# No usamos HEALTHCHECK de Docker, pero activamos el health check interno del proxy
docker run -d --name cloud-sql-proxy --network fraud-net --restart always \
  gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.2 \
  --structured-logs \
  --port 5432 \
  --health-check \
  --http-port 9090 \
  "$CLOUD_SQL_CONNECTION_NAME"

# --- Descargar la Imagen del Worker ---
echo "--- Descargando imagen del worker ---"
if ! docker pull $WORKER_IMAGE_URI; then
  echo "ERROR: Failed to pull worker image"
  exit 1
fi

# --- BUCLE DE ESPERA MEJORADO CON VERIFICACIÓN EXTERNA ---
echo "--- Esperando a que el proxy de Cloud SQL esté listo... ---"
RETRY_COUNT=0
MAX_RETRIES=12
SLEEP_INTERVAL=5

# Verificamos usando un contenedor temporal con curl
while ! docker run --rm --network fraud-net curlimages/curl:8.4.0 \
  --fail --silent --max-time 2 http://cloud-sql-proxy:9090/readiness; do
  
  RETRY_COUNT=$((RETRY_COUNT+1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "¡ERROR! El proxy de Cloud SQL no respondió después de $((MAX_RETRIES*SLEEP_INTERVAL)) segundos."
    docker logs cloud-sql-proxy
    exit 1
  fi
  echo "Intento $RETRY_COUNT/$MAX_RETRIES: El proxy aún no está listo, esperando $SLEEP_INTERVAL segundos..."
  sleep $SLEEP_INTERVAL
done

echo "--- ¡El proxy de Cloud SQL está listo! ---"
docker logs --tail 20 cloud-sql-proxy

# --- Ejecutar Migraciones de la Base de Datos ---
echo "--- Ejecutando migraciones de la base de datos ---"
docker run --rm --name alembic-migration --network fraud-net \
  -e DATABASE_URL="$DATABASE_URL" \
  -e GOOGLE_API_KEY="$GOOGLE_API_KEY" \
  -e GOOGLE_GEMINI_API_KEY="$GOOGLE_GEMINI_API_KEY" \
  -e GOOGLE_SEARCH_ENGINE_ID="$GOOGLE_SEARCH_ENGINE_ID" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e JWT_ALGORITHM="$JWT_ALGORITHM" \
  -e ENVIRONMENT="$ENVIRONMENT" \
  $WORKER_IMAGE_URI alembic upgrade head

# --- Ejecutar Contenedores de los Workers ---
NUM_ANALYSIS_WORKERS=3
echo "--- Iniciando $NUM_ANALYSIS_WORKERS workers de análisis ---"
for i in $(seq 1 $NUM_ANALYSIS_WORKERS); do
  echo "Iniciando worker analysis-worker-$i..."
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

# --- Verificación final ---
echo "--- Verificando estado de los contenedores ---"
docker ps -a

echo "--- Verificando salud del proxy ---"
if ! docker run --rm --network fraud-net curlimages/curl:8.4.0 \
  --fail --silent --max-time 2 http://cloud-sql-proxy:9090/readiness; then
  echo "ERROR: Cloud SQL Proxy health check failed"
  docker logs cloud-sql-proxy
  exit 1
fi

echo "--- Verificando workers activos ---"
ACTIVE_WORKERS=$(docker ps --filter "name=analysis-worker-" --format "{{.Names}}" | wc -l)
if [ "$ACTIVE_WORKERS" -ne "$NUM_ANALYSIS_WORKERS" ]; then
  echo "ERROR: Solo $ACTIVE_WORKERS workers están activos (se esperaban $NUM_ANALYSIS_WORKERS)"
  docker ps -a
  exit 1
fi

echo "--- Verificando conexión a Redis ---"
if ! docker exec redis redis-cli ping | grep -q "PONG"; then
  echo "ERROR: No se pudo conectar a Redis"
  exit 1
fi

echo "--- Script de inicio finalizado exitosamente ---"