import logging
import redis
from rq import Queue
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    redis_conn = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        password=settings.REDIS_PASSWORD,
        ssl=settings.REDIS_SSL,
    )
    redis_conn.ping()
    logger.info("Successfully connected to Redis for RQ.")
except redis.exceptions.ConnectionError as e:
    logger.critical(f"Could not connect to Redis for RQ. Error: {e}")
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