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
    docs_url=f"{settings.API_V1_STR}/docs",  # Added Swagger UI endpoint
    redoc_url=f"{settings.API_V1_STR}/redoc"  # Added ReDoc endpoint
)

# Rate limiting configuration
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:3000",
    # Add production domains when ready
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining"]  # For rate limiting
)

# Include your API router
from app.api.endpoints import router as api_router
app.include_router(
    api_router,
    prefix=settings.API_V1_STR,
    tags=["API"]  # Optional: for Swagger grouping
)

@app.get("/")
async def read_root():
    """Health check endpoint"""
    return {
        "status": "running",
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }