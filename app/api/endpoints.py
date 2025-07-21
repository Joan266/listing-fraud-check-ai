import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# Import components from their correct locations
from app.db import models
from app.db.session import get_db
from app.queues import analysis_fast_queue
from app.workers.orchestrator import start_full_analysis
from app.schemas import FraudCheckRequest, JobResponse, JobStatusResponse
from app.utils.helpers import generate_input_hash # Import your hashing utility

# Create a router to group all related endpoints
router = APIRouter()


@router.post("/analysis", response_model=JobResponse, status_code=202)
def create_analysis(
    request: FraudCheckRequest,
    db: Session = Depends(get_db)
):
    """
    Accepts the analysis request, creates a job record in the database,
    and enqueues the main orchestrator job to start the full analysis.
    This endpoint is now idempotent thanks to the input_hash check.
    """
    if not analysis_fast_queue:
        raise HTTPException(status_code=503, detail="Worker service is unavailable.")

    input_data = request.model_dump(exclude_unset=True)

    # 1. Generate a unique hash from the input data.
    input_hash = generate_input_hash(input_data)

    # 2. Check if an analysis with this exact input already exists.
    existing_check = db.query(models.FraudCheck).filter(models.FraudCheck.input_hash == input_hash).first()
    if existing_check:
        # If it exists, return the existing job_id instead of creating a new one.
        return {"job_id": str(existing_check.id)}

    # 3. If it's new, create the record and include the hash.
    new_check = models.FraudCheck(
        input_hash=input_hash,
        input_data=input_data,
        status=models.JobStatus.PENDING
    )
    db.add(new_check)
    db.commit()
    db.refresh(new_check)

    # Enqueue the orchestrator job for the new record.
    analysis_fast_queue.enqueue(start_full_analysis, new_check.id)
    
    return {"job_id": str(new_check.id)}


@router.get("/analysis/{check_id}", response_model=JobStatusResponse)
def get_analysis_status(check_id: str, db: Session = Depends(get_db)):
    """
    Polls for the status and result of a fraud check analysis.
    """
    try:
        job_uuid = uuid.UUID(check_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid analysis ID format.")
        
    check_result = db.query(models.FraudCheck).filter(models.FraudCheck.id == job_uuid).first()
    
    if not check_result:
        raise HTTPException(status_code=404, detail="Analysis ID not found.")
        
    return check_result