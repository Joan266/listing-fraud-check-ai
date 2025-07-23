import redis
from rq import Queue
from app.core.config import settings

# This block attempts to connect to Redis.
# If it fails, it prints an error and sets the connection to None
# so the application can handle the failure gracefully.
try:
    redis_conn = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
    )
    redis_conn.ping()
    print("Successfully connected to Redis for RQ.")
except redis.exceptions.ConnectionError as e:
    print(f"FATAL: Could not connect to Redis for RQ. Error: {e}")
    redis_conn = None

# Create the queue objects only if the Redis connection was successful
if redis_conn:
    analysis_fast_queue = Queue('analysis-fast', connection=redis_conn)
    analysis_heavy_queue = Queue('analysis-heavy', connection=redis_conn)
    chat_queue = Queue('chats', connection=redis_conn)
else:
    analysis_fast_queue = None
    analysis_heavy_queue = None
    chat_queue = None