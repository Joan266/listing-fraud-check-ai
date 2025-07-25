from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import router as api_router
from app.core.config import settings
from app.db import models 
from app.db.session import engine 

# This creates your database tables based on your models.
models.Base.metadata.create_all(bind=engine)

# Create the main FastAPI application instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# A list of allowed origins for CORS (Cross-Origin Resource Sharing)
# This is important for allowing your frontend application to communicate with the API
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:3000",
    "null",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    """
    A simple root endpoint to confirm that the API is running.
    """
    return {"status": f"Welcome to the {settings.PROJECT_NAME} API"}