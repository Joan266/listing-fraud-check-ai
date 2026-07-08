from datetime import datetime
import uuid
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, Union
from app.db.models import JobStatus
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    session_id: str
    chat_id: str
    message: Message
    
class ChatResponse(BaseModel):
    chat_id: str
    response: Message

class ExtractRequest(BaseModel):
    session_id: str = Field(..., max_length=100)
    listing_content: str = Field(..., max_length=100_000)

class ExtractedData(BaseModel):
    listing_url: Optional[str] = Field(None, max_length=2048)
    address: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = Field(None, max_length=20_000)
    image_urls: Optional[List[str]] = Field(None, max_length=20)
    communication_text: Optional[str] = Field(None, max_length=20_000)
    host_email: Optional[str] = Field(None, max_length=320)
    host_phone: Optional[str] = Field(None, max_length=30)
    reviews: Optional[List[Dict[str, Any]]] = Field(None, max_length=50)
    price_details: Optional[str] = Field(None, max_length=2000)
    host_profile: Optional[Dict[str, Any]] = None
    property_type: Optional[str] = Field(None, max_length=100)
    check_in: Optional[str] = Field(None, max_length=30)
    check_out: Optional[str] = Field(None, max_length=30)
    number_of_people: Optional[int] = Field(None, ge=0, le=100)

class RawExtractedData(BaseModel):
    listing_url: Optional[str] = None
    property_type: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    image_urls: Optional[List[str]] = None
    communication_text: Optional[str] = None
    host_email: Optional[str] = None
    host_phone: Optional[str] = None
    base_price_text: Optional[str] = None
    cleaning_fee: Optional[str] = None
    service_fee: Optional[str] = None
    security_deposit: Optional[str] = None
    taxes: Optional[str] = None
    discounts_text: Optional[str] = None
    payment_terms_text: Optional[str] = None
    reviews: Optional[List[Dict[str, Any]]] = None
    host_profile: Optional[Dict[str, Any]] = None


class UrlExtractRequest(BaseModel):
    session_id: str = Field(..., max_length=100)
    listing_url: str = Field(..., max_length=2048)

class UrlExtractResponse(BaseModel):
    extracted_data: ExtractedData
    screenshot_url: Optional[str] = None
    scrape_source: str = "unknown"

class ExtractDataResponse(BaseModel):
    extracted_data: ExtractedData
class FraudCheckRequest(ExtractedData):
    session_id: str
class JobResponse(BaseModel):
    job_id: str

class FinalReport(BaseModel):
    authenticity_score: int
    quality_score: int
    sidebar_summary: str
    explanation: str
    suggested_actions: List[str]
    flags: List[Dict[str, str]]
    

class ErrorReport(BaseModel):
    error: str
 
class ChatHistoryItem(BaseModel):
    id: uuid.UUID
    messages: List[Message]
    class Config:
        from_attributes = True

# --- Add this new schema ---
class AnalysisStep(BaseModel):
    job_name: str
    description: str
    status: str
    inputs_used: dict
    result: dict

# --- Update this schema ---
class JobStatusResponse(BaseModel):
    id: uuid.UUID
    status: JobStatus
    input_data: dict
    final_report: Optional[Union[FinalReport, ErrorReport]] = None
    created_at: datetime
    chat: Optional[ChatHistoryItem] = None
    analysis_steps: Optional[List[Dict[str, Any]]] = None 

    model_config = ConfigDict(from_attributes=True)

class HistoryItem(BaseModel):
    id: str
    status: str
    created_at: datetime
    final_report: Optional[FinalReport] = None
    input_data: ExtractedData
    chat_id: Optional[str] = None
    
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
    )


class HistoryResponse(BaseModel):
    """
    The response for the history endpoint.
    """
    history: List[JobStatusResponse] = []


class FeedbackRequest(BaseModel):
    was_fraud: bool
    comments: Optional[str] = Field(None, max_length=2000)


class FeedbackResponse(BaseModel):
    id: str
    fraud_check_id: str
    was_fraud: bool
    comments: Optional[str] = None

