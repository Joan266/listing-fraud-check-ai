from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, Header, Request, Query
from sqlalchemy.orm import Session
from app.core.limiter import limiter
from app.db import models
from app.db.session import get_db
from app.workers.queues import analysis_fast_queue
from app.schemas import FraudCheckRequest, JobResponse, JobStatusResponse, ChatRequest,HistoryResponse, ChatResponse,ExtractRequest, ExtractDataResponse, Message
from app.services import chat_service, extract_data_service


router = APIRouter()

@router.post("/extract-data", response_model=ExtractDataResponse)
@limiter.limit("2/minute")
def extract_data_from_text(request: Request, extract_request: ExtractRequest):
    """
    Handles the initial data-gathering step.
    """
    if not extract_request.listing_content:
        raise HTTPException(status_code=400, detail="Listing content cannot be empty.")
   
    formatted_data = extract_data_service.extract_and_format_data(extract_request.listing_content)
    return {"extracted_data": formatted_data}


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
def handle_post_analysis_chat(request: Request, chat_request: ChatRequest, db: Session = Depends(get_db)):
    """
    Handles follow-up questions from the user after the analysis is complete.
    Requires both a session_id and a chat_id to identify the conversation context.
    """
    if not chat_request.session_id or not chat_request.chat_id:
        raise HTTPException(status_code=400, detail="A session_id and chat_id are required.")
    
    user_message = chat_request.message.model_dump()
    # Fetch the AI's response to the user's question
    response_data = chat_service.process_q_and_a(
        session_id=chat_request.session_id, 
        chat_id=uuid.UUID(chat_request.chat_id),
        user_message=user_message,
        db=db
    )
    
    # Return the AI's response to the frontend
    return ChatResponse(
        chat_id=response_data["chat_id"],
        response=response_data["response"],
    )


@router.post("/analysis", response_model=JobResponse, status_code=202)
@limiter.limit("10/hour")
def create_analysis(request: Request, fraud_request: FraudCheckRequest, db: Session = Depends(get_db)):
    """
    Starts a new full analysis based on the verified data from the frontend.
    This is the most resource-intensive endpoint.
    """
    from app.workers.orchestrator import start_full_analysis
    from app.utils.helpers import generate_hash

    if not analysis_fast_queue:
        raise HTTPException(status_code=503, detail="Worker service unavailable.")

    # Exclude session_id for hashing to ensure duplicate checks work across sessions
    input_data = fraud_request.model_dump(exclude_unset=True, exclude={'session_id', 'chat_history'})
    
    input_hash = generate_hash(input_data)

    # Check if this exact analysis has been run before to save resources
    existing_check = db.query(models.FraudCheck).filter(models.FraudCheck.input_hash == input_hash).first()
    if existing_check:
        return {"job_id": str(existing_check.id)}

    # Create a new record for this analysis
    new_check = models.FraudCheck(
        input_hash=input_hash,
        input_data=input_data,
        session_id=fraud_request.session_id,
        status=models.JobStatus.PENDING
    )
    db.add(new_check)
    db.commit()
    db.refresh(new_check)
    new_chat = models.Chat(
        session_id=fraud_request.session_id,
        fraud_check_id=new_check.id # Link the chat to the analysis
    )
    db.add(new_chat)
    db.commit()
    analysis_fast_queue.enqueue(start_full_analysis, new_check.id)
    return {"job_id": str(new_check.id)}


@router.get("/analysis/{check_id}", response_model=JobStatusResponse)
@limiter.limit("60/minute")
def get_analysis_status(
    request: Request,
    check_id: str,
    session_id: str = Header(..., alias="session_id"), 
    db: Session = Depends(get_db)
):
    """
    Polls for the status of an analysis.
    Ensures the user requesting the status is the one who initiated it.
    """
    try:
        job_uuid = uuid.UUID(check_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid check_id format.")

    check_result = db.query(models.FraudCheck).filter(models.FraudCheck.id == job_uuid).first()
    if not check_result:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    
    if check_result.session_id != session_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this analysis.")
        
    return check_result

@router.get("/chat/{chat_id}/messages", response_model=List[Message])
@limiter.limit("20/minute")
def get_chat_messages(
    request: Request,
    chat_id: str,
    session_id: str = Header(..., alias="session_id"),
    db: Session = Depends(get_db)
):
    """Gets all messages for a specific chat, verifying session ownership."""
    chat_uuid = uuid.UUID(chat_id)
    chat = db.query(models.Chat).filter(models.Chat.id == chat_uuid).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found.")
    if chat.session_id != session_id:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    return chat.messages
@router.get("/analysis/history/{url_session_id}", response_model=HistoryResponse) 
@limiter.limit("20/minute")
def get_session_history(
    request: Request,
    url_session_id: str,
    session_id: str = Header(..., alias="session_id"),
    db: Session = Depends(get_db)
):
    """Gets the analysis history for a given session_id."""
    print(f"Fetching history for session_id: {url_session_id}")
    reports = db.query(models.FraudCheck).filter(
        models.FraudCheck.session_id == url_session_id,
        models.FraudCheck.status == models.JobStatus.COMPLETED 
    ).order_by(models.FraudCheck.created_at.desc()).all()
    
    return HistoryResponse(history=reports)