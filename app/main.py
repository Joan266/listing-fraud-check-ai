# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.db import models
from app.db.session import engine

# Create database tables (only for development)
if settings.ENVIRONMENT == "development":
    models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc"
)

# Rate limiting configuration
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
# THIS IS THE KEY FIX: We now use the settings from config.py,
# which reads the BACKEND_CORS_ORIGINS environment variable.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining"]
)

# Include your API router
from app.api.endpoints import router as api_router
app.include_router(
    api_router,
    prefix=settings.API_V1_STR,
    tags=["API"]
)

@app.get("/")
async def read_root():
    """Health check endpoint"""
    return {
        "status": "running",
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }
