
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

def get_limiter():
# For production, use Redis-based rate limiting
    if settings.ENVIRONMENT == "production":

        return Limiter(
            key_func=get_remote_address,
            storage_uri=f"rediss://default:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}" if settings.REDIS_SSL else f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}",
            storage_options={"socket_connect_timeout": 30}
        )
    else:
        # For development, use in-memory rate limiting
        return Limiter(key_func=get_remote_address)

# Create the limiter instance
limiter = get_limiter()

if settings.DISABLE_RATE_LIMIT:
    limiter.enabled = False

# Default rate limits
default_limits = [settings.API_RATE_LIMIT]
