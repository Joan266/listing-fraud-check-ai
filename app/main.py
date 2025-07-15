# app/main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
import redis
from rq import Queue
import uuid

from app.db import models
from app.db.database import engine, get_db
from app.tasks.fraud_checker import run_address_check_task
from app.core.config import settings

# Create database tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)
origins = [
    "http://localhost",
    "http://localhost:5500", # For Live Server
    "http://127.0.0.1:5500",
    "http://127.0.0.1:3000",# For Live Server
    "http://localhost:5173", # For Live Server
    "null" # To allow opening the index.html as a local file
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Redis and RQ setup
try:
    redis_conn = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT)
    # Ping to check connection
    redis_conn.ping()
    q = Queue(connection=redis_conn)
except redis.exceptions.ConnectionError as e:
    # Handle case where Redis is not available
    print(f"FATAL: Could not connect to Redis at {settings.REDIS_HOST}:{settings.REDIS_PORT}. Please ensure Redis is running. Error: {e}")
    q = None # Set queue to None to handle gracefully


# --- Pydantic Models for API ---
class AddressCheckRequest(BaseModel):
    address: str
    description: str | None = None
    image_urls: list[str] | None = None
    communication_text: str | None = None

class JobResponse(BaseModel):
    job_id: str

class JobStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: models.JobStatus
    input_data: dict
    result: dict | None = None


# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}

@app.post(f"{settings.API_V1_STR}/checks", response_model=JobResponse, status_code=202)
def create_address_check(request: AddressCheckRequest, db: Session = Depends(get_db)):
    """
    Accepts an address, creates a new check job, and enqueues it for validation.
    """
    if not q:
        raise HTTPException(status_code=503, detail="Service unavailable: Could not connect to task queue.")

    new_check = models.FraudCheck(input_data=request.model_dump())
    db.add(new_check)
    db.commit()
    db.refresh(new_check)
    
    # Enqueue the background task
    q.enqueue(run_address_check_task, str(new_check.id))
    
    return {"job_id": str(new_check.id)}

@app.get(f"{settings.API_V1_STR}/checks/{{job_id}}", response_model=JobStatusResponse)
def get_check_status(job_id: str, db: Session = Depends(get_db)):
    """
    Polls for the status and result of a fraud check job.
    """
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Job ID format.")
        
    result = db.query(models.FraudCheck).filter(models.FraudCheck.id == job_uuid).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Job ID not found.")
        
    return result