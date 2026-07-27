#!/bin/bash
set -e

# Start RQ workers in background
rq worker analysis-fast analysis-heavy chats \
  --url "rediss://default:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}" &

# Start API server (foreground — Cloud Run needs this)
exec gunicorn -k uvicorn.workers.UvicornWorker -w 2 --timeout 600 --bind "0.0.0.0:${PORT:-8000}" app.main:app
