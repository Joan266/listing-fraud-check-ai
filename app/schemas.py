from datetime import datetime
import uuid
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
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
    session_id: str
    listing_content: str

class ExtractedData(BaseModel):
    listing_url: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    image_urls: Optional[List[str]] = None
    communication_text: Optional[str] = None
    host_email: Optional[str] = None
    host_phone: Optional[str] = None
    reviews: Optional[List[Dict[str, Any]]] = None
    price_details: Optional[str] = None
    host_profile: Optional[Dict[str, Any]] = None
    property_type: Optional[str] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    number_of_people: Optional[int] = None

# ALIASES for backward compatibility with services that haven't been updated.
ExtractedListingData = ExtractedData
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
class ChatHistoryItem(BaseModel):
    id: uuid.UUID
    messages: List[Message]
    class Config:
        from_attributes = True

class JobStatusResponse(BaseModel):
    id: uuid.UUID
    status: JobStatus
    input_data: dict
    final_report: Optional[FinalReport] = None
    created_at: datetime
    chat: Optional[ChatHistoryItem] = None # <-- Add this line

    class Config:
        from_attributes = True

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
    FIX: The list should contain JobStatusResponse objects.
    """
    history: List[JobStatusResponse] = []

class AnalysisStep(BaseModel):
    job_name: str
    description: str      
    status: str          
    inputs_used: dict     
    result: dict         