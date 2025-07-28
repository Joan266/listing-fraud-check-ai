import uuid
from fastapi import APIRouter, Depends, HTTPException, Header, Request, Query
from sqlalchemy.orm import Session
from app.core.limiter import limiter
from app.db import models
from app.db.session import get_db
from app.workers.queues import analysis_fast_queue
from app.schemas import FraudCheckRequest, JobResponse, JobStatusResponse, ChatRequest, ChatResponse
from app.services import chat_service

router = APIRouter()

@router.post("/extract-data", response_model=ChatResponse)
@limiter.limit("30/minute") # Allow frequent chat/extraction messages
def extract_data_from_chat(request: Request, chat_request: ChatRequest):
    """Handles the initial data-gathering conversation with the user."""
    user_message = chat_request.message.model_dump()
    response = chat_service.process_data_extraction(chat_request.session_id, user_message)
    return response

@router.post("/chat", response_model=ChatResponse)
@limiter.limit("30/minute") # Also limit the post-analysis chat
def handle_post_analysis_chat(request: Request, chat_request: ChatRequest):
    """Handles follow-up questions from the user after the analysis is complete."""
    if not chat_request.session_id:
        raise HTTPException(status_code=400, detail="A session_id is required.")
    
    user_message = chat_request.message.model_dump()
    response = chat_service.process_q_and_a(chat_request.session_id, user_message)
    return response

@router.post("/analysis", response_model=JobResponse, status_code=202)
@limiter.limit("5/hour") # Add a strict limit to this expensive endpoint
def create_analysis(request: Request, fraud_request: FraudCheckRequest, db: Session = Depends(get_db)):
    """Starts a new analysis linked to a session_id."""
    from app.workers.orchestrator import start_full_analysis
    from app.utils.helpers import generate_hash

    if not analysis_fast_queue:
        raise HTTPException(status_code=503, detail="Worker service unavailable.")

    input_data = fraud_request.model_dump(exclude_unset=True)
    input_hash = generate_hash(input_data)

    existing_check = db.query(models.FraudCheck).filter(models.FraudCheck.input_hash == input_hash).first()
    if existing_check:
        return {"job_id": str(existing_check.id)}

    new_check = models.FraudCheck(
        input_hash=input_hash,
        input_data=input_data,
        session_id=fraud_request.session_id,
        status=models.JobStatus.PENDING
    )
    db.add(new_check)
    db.commit()
    db.refresh(new_check)

    analysis_fast_queue.enqueue(start_full_analysis, new_check.id)
    return {"job_id": str(new_check.id)}

@router.get("/analysis/{check_id}", response_model=JobStatusResponse)
@limiter.limit("60/minute") 
def get_analysis_status(
    request: Request,
    check_id: str,
    session_id: str = Header(...),
    db: Session = Depends(get_db)
):
    """Polls for the status of an analysis, ensuring the user owns it via session_id."""
    job_uuid = uuid.UUID(check_id)
    check_result = db.query(models.FraudCheck).filter(models.FraudCheck.id == job_uuid).first()
    
    if not check_result:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    
    if check_result.session_id != session_id:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    return check_result

@router.get("/analysis/history")
@limiter.limit("20/minute")
def get_session_history(
    request: Request,
    db: Session = Depends(get_db),
    session_id: str = Query(...) 
):
    """Gets the analysis history for a given session_id."""
    history = db.query(models.FraudCheck).filter(models.FraudCheck.session_id == session_id).all()
    return history