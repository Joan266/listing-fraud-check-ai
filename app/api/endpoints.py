import asyncio
import json
import logging
from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, Header, Request, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sse_starlette.sse import EventSourceResponse

logger = logging.getLogger(__name__)

from app.core.limiter import limiter
from app.db import models
from app.db.session import async_get_db, SessionLocal
from app.workers.queues import analysis_fast_queue, redis_conn
from app.schemas import (
    FraudCheckRequest, JobResponse, JobStatusResponse,
    ChatRequest, HistoryResponse, ChatResponse,
    ExtractRequest, ExtractDataResponse,
    UrlExtractRequest, UrlExtractResponse,
    FeedbackRequest, FeedbackResponse, Message,
)
from app.services import chat_service, extract_data_service


router = APIRouter()


@router.post("/extract-data", response_model=ExtractDataResponse)
@limiter.limit("2/minute")
async def extract_data_from_text(request: Request, extract_request: ExtractRequest):
    """Handles the initial data-gathering step."""
    if not extract_request.listing_content:
        raise HTTPException(status_code=400, detail="Listing content cannot be empty.")
    if len(extract_request.listing_content) > 50_000:
        raise HTTPException(status_code=400, detail="Listing content exceeds maximum length (50,000 characters).")

    formatted_data = await asyncio.to_thread(
        extract_data_service.extract_and_format_data,
        extract_request.listing_content,
    )
    return {"extracted_data": formatted_data}


@router.post("/extract-from-url", response_model=UrlExtractResponse)
@limiter.limit("2/minute")
async def extract_data_from_url(request: Request, url_request: UrlExtractRequest):
    """Scrapes a listing URL and extracts structured data from the page content."""
    from app.utils.validators import validate_external_url
    from app.services import url_scraper

    try:
        validate_external_url(url_request.listing_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    scrape_result = await asyncio.to_thread(url_scraper.scrape_url, url_request.listing_url)
    markdown = scrape_result.get("markdown", "")

    if not markdown or len(markdown) < 50:
        raise HTTPException(status_code=422, detail="Could not extract enough content from the URL.")

    formatted_data = await asyncio.to_thread(
        extract_data_service.extract_and_format_data, markdown
    )
    if isinstance(formatted_data, dict):
        formatted_data["listing_url"] = url_request.listing_url

    return UrlExtractResponse(
        extracted_data=formatted_data,
        screenshot_url=scrape_result.get("screenshot_url"),
        scrape_source=scrape_result.get("source", "unknown"),
    )


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
async def handle_post_analysis_chat(request: Request, chat_request: ChatRequest):
    """Handles follow-up questions from the user after the analysis is complete."""
    if not chat_request.session_id or not chat_request.chat_id:
        raise HTTPException(status_code=400, detail="A session_id and chat_id are required.")

    user_message = chat_request.message.model_dump()

    def _process_chat():
        db = SessionLocal()
        try:
            return chat_service.process_q_and_a(
                session_id=chat_request.session_id,
                chat_id=uuid.UUID(chat_request.chat_id),
                user_message=user_message,
                db=db,
            )
        finally:
            db.close()

    response_data = await asyncio.to_thread(_process_chat)

    return ChatResponse(
        chat_id=response_data["chat_id"],
        response=response_data["response"],
    )


@router.post("/analysis", response_model=JobResponse, status_code=202)
@limiter.limit("10/hour")
async def create_analysis(
    request: Request,
    fraud_request: FraudCheckRequest,
    db: AsyncSession = Depends(async_get_db),
):
    """Starts a new full analysis based on the verified data from the frontend."""
    from app.workers.orchestrator import start_full_analysis
    from app.utils.helpers import generate_hash

    if not analysis_fast_queue:
        raise HTTPException(status_code=503, detail="Worker service unavailable.")

    input_data = fraud_request.model_dump(exclude_unset=True, exclude={'session_id', 'chat_history'})
    input_hash = generate_hash(input_data)

    result = await db.execute(
        select(models.FraudCheck).where(models.FraudCheck.input_hash == input_hash)
    )
    existing_check = result.scalar_one_or_none()
    if existing_check:
        return {"job_id": str(existing_check.id)}

    new_check = models.FraudCheck(
        input_hash=input_hash,
        input_data=input_data,
        session_id=fraud_request.session_id,
        status=models.JobStatus.PENDING,
    )
    db.add(new_check)
    await db.commit()
    await db.refresh(new_check)

    new_chat = models.Chat(
        session_id=fraud_request.session_id,
        fraud_check_id=new_check.id,
    )
    db.add(new_chat)
    await db.commit()

    analysis_fast_queue.enqueue(start_full_analysis, new_check.id)
    return {"job_id": str(new_check.id)}


@router.get("/analysis/history/{url_session_id}", response_model=HistoryResponse)
@limiter.limit("20/minute")
async def get_session_history(
    request: Request,
    url_session_id: str,
    session_id: str = Header(...),
    db: AsyncSession = Depends(async_get_db),
):
    """Gets the analysis history for a given session_id."""
    logger.info(f"Fetching history for session_id: {url_session_id}")
    result = await db.execute(
        select(models.FraudCheck)
        .options(
            selectinload(models.FraudCheck.chat)
            .selectinload(models.Chat.messages)
        )
        .where(
            models.FraudCheck.session_id == url_session_id,
            models.FraudCheck.status == models.JobStatus.COMPLETED,
        )
        .order_by(models.FraudCheck.created_at.desc())
    )
    reports = result.scalars().all()
    return HistoryResponse(history=reports)


@router.get("/analysis/{check_id}/stream")
async def stream_analysis_progress(
    request: Request,
    check_id: str,
    session_id: str = Query(...),
):
    """
    SSE endpoint that streams real-time analysis progress.
    Uses query param for session_id since EventSource can't send custom headers.
    """
    try:
        uuid.UUID(check_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid check_id format.")

    channel = f"analysis:{check_id}:progress"

    async def event_generator():
        if not redis_conn:
            yield {"event": "error", "data": json.dumps({"error": "Redis unavailable"})}
            return

        pubsub = redis_conn.pubsub()
        pubsub.subscribe(channel)
        try:
            while True:
                if await request.is_disconnected():
                    break
                message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message["type"] == "message":
                    data = message["data"]
                    if isinstance(data, bytes):
                        data = data.decode("utf-8")
                    parsed = json.loads(data)
                    yield {"event": "step_complete", "data": data}
                    if parsed.get("job_name") == "aggregate_and_conclude":
                        yield {"event": "done", "data": json.dumps({"status": "COMPLETED"})}
                        break
                else:
                    yield {"event": "heartbeat", "data": ""}
                await asyncio.sleep(0.5)
        finally:
            pubsub.unsubscribe(channel)
            pubsub.close()

    return EventSourceResponse(event_generator())


@router.get("/analysis/{check_id}", response_model=JobStatusResponse)
@limiter.limit("60/minute")
async def get_analysis_status(
    request: Request,
    check_id: str,
    session_id: str = Header(...),
    db: AsyncSession = Depends(async_get_db),
):
    """Polls for the status of an analysis."""
    try:
        job_uuid = uuid.UUID(check_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid check_id format.")

    result = await db.execute(
        select(models.FraudCheck)
        .options(
            selectinload(models.FraudCheck.chat)
            .selectinload(models.Chat.messages)
        )
        .where(models.FraudCheck.id == job_uuid)
    )
    check_result = result.scalar_one_or_none()
    if not check_result:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    if check_result.session_id != session_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this analysis.")

    return check_result


@router.get("/chat/{chat_id}/messages", response_model=List[Message])
@limiter.limit("20/minute")
async def get_chat_messages(
    request: Request,
    chat_id: str,
    session_id: str = Header(...),
    db: AsyncSession = Depends(async_get_db),
):
    """Gets all messages for a specific chat, verifying session ownership."""
    chat_uuid = uuid.UUID(chat_id)
    result = await db.execute(
        select(models.Chat)
        .options(selectinload(models.Chat.messages))
        .where(models.Chat.id == chat_uuid)
    )
    chat = result.scalar_one_or_none()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found.")
    if chat.session_id != session_id:
        raise HTTPException(status_code=403, detail="Not authorized.")

    return chat.messages


@router.post("/analysis/{check_id}/feedback", response_model=FeedbackResponse, status_code=201)
@limiter.limit("5/minute")
async def submit_feedback(
    request: Request,
    check_id: str,
    feedback: FeedbackRequest,
    session_id: str = Header(...),
    db: AsyncSession = Depends(async_get_db),
):
    """Submit user feedback on whether a flagged listing was actually fraud."""
    try:
        job_uuid = uuid.UUID(check_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid check_id format.")

    result = await db.execute(
        select(models.FraudCheck).where(models.FraudCheck.id == job_uuid)
    )
    check = result.scalar_one_or_none()
    if not check:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    if check.session_id != session_id:
        raise HTTPException(status_code=403, detail="Not authorized.")

    existing = await db.execute(
        select(models.Feedback).where(models.Feedback.fraud_check_id == job_uuid)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Feedback already submitted for this analysis.")

    new_feedback = models.Feedback(
        fraud_check_id=job_uuid,
        was_fraud=feedback.was_fraud,
        comments=feedback.comments,
    )
    db.add(new_feedback)
    await db.commit()
    await db.refresh(new_feedback)

    return FeedbackResponse(
        id=str(new_feedback.id),
        fraud_check_id=str(new_feedback.fraud_check_id),
        was_fraud=new_feedback.was_fraud,
        comments=new_feedback.comments,
    )
