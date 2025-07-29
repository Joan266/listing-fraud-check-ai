from slowapi import Limiter
from slowapi.util import get_remote_address
from redis import Redis
from app.core.config import settings

# For production, use Redis-based rate limiting
if settings.ENVIRONMENT == "production":
    redis_connection = Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        password=settings.REDIS_PASSWORD,
        db=settings.REDIS_DB,
        decode_responses=True
    )
    
    limiter = Limiter(
        key_func=get_remote_address,
        storage_uri=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}",
        storage_options={"socket_connect_timeout": 30}
    )
else:
    # For development, use in-memory rate limiting
    limiter = Limiter(key_func=get_remote_address)

# Default rate limits
default_limits = [settings.API_RATE_LIMIT]