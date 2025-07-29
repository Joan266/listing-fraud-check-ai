import datetime
import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.db.models import JobStatus

# --- Internal Data Structures ---

class Message(BaseModel):
    """Represents a single message in a chat."""
    role: str
    content: str

class ExtractedListingData(BaseModel):
    """Schema for the structured data after formatting."""
    listing_url: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    image_urls: Optional[List[str]] = Field(default_factory=list)
    communication_text: Optional[str] = None
    host_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    reviews: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    price_details: Optional[str] = None
    host_profile: Optional[Dict[str, Any]] = Field(default_factory=dict)
    property_type: Optional[str] = None

class FinalReport(BaseModel):
    """Schema for the final, synthesized report."""
    authenticity_score: int
    quality_score: int
    sidebar_summary: str
    chat_explanation: str
    suggested_actions: List[str]

# --- API Request Payloads (Data SENT to the API) ---

class ExtractRequest(BaseModel):
    session_id: str
    listing_content: str

class ChatRequest(BaseModel):
    session_id: str
    chat_id: str
    message: Message

class FraudCheckRequest(ExtractedListingData):
    """The main analysis request, including session info."""
    session_id: str

# --- API Response Payloads (Data RECEIVED from the API) ---

class ExtractDataResponse(BaseModel):
    """The response from the initial data extraction."""
    extracted_data: ExtractedListingData

class ChatResponse(BaseModel):
    """The response for a post-analysis chat message."""
    chat_id: str
    response: Message

class JobResponse(BaseModel):
    """Generic response for starting a background job."""
    job_id: str

class JobStatusResponse(BaseModel):
    """The response for the analysis status polling endpoint."""
    id: uuid.UUID
    status: JobStatus
    input_data: dict
    final_report: Optional[FinalReport] = None
    created_at: datetime

    class Config:
        from_attributes = True

class HistoryResponse(BaseModel):
    history: List[JobStatusResponse] = []