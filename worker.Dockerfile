# worker.Dockerfile (versión corregida)
FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Mantener las variables con valores por defecto
ENV ENVIRONMENT=production \
    JWT_ALGORITHM=HS256 \
    GOOGLE_API_KEY=default_api_key \
    GOOGLE_GEMINI_API_KEY=default_gemini_key \
    GOOGLE_SEARCH_ENGINE_ID=default_search_engine \
    JWT_SECRET=default_jwt_secret \
    DATABASE_URL=postgresql://user:pass@localhost/dbname \
    REDIS_HOST=localhost \
    REDIS_PORT=6379

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

# Healthcheck usando script externo
COPY healthcheck.py .
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python healthcheck.py