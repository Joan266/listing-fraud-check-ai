import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.db.models import JobStatus

# --- Base Models for API Requests & Responses ---

class Message(BaseModel):
    """Represents a single message in a chat."""
    role: str
    content: str

class ChatRequest(BaseModel):
    """
    Defines the structure for incoming requests to chat-related endpoints.
    """
    session_id: str
    chat_id: Optional[str] = None 
    message: Message
class RawExtractedData(BaseModel):
    listing_url: Optional[str] = None
    property_type: Optional[str] = None
    address: Optional[str] = None
    general_overview: Optional[str] = None
    amenities: Optional[List[str]] = None
    notable_features: Optional[List[str]] = None
    area_description: Optional[str] = None
    rules_and_restrictions: Optional[List[str]] = None
    suspicious_notes: Optional[List[str]] = None
    image_urls: Optional[List[str]] = None
    communication_text: Optional[str] = None
    host_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    base_price_text: Optional[str] = None
    cleaning_fee: Optional[str] = None
    service_fee: Optional[str] = None
    security_deposit: Optional[str] = None
    taxes: Optional[str] = None
    discounts_text: Optional[str] = None
    payment_terms_text: Optional[str] = None
    reviews: Optional[List[Dict[str, Any]]] = None
    host_profile: Optional[Dict[str, Any]] = None

class ExtractedListingData(BaseModel):
    """
    Schema for the structured data extracted from the initial raw text.
    All fields are optional as their presence depends on the source text.
    """
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

class FraudCheckRequest(ExtractedListingData):
    """
    Schema for the main analysis request. Inherits all fields from
    ExtractedListingData and adds the session_id.
    """
    session_id: str
    chat_history: Optional[List[Message]] = Field(default_factory=list)

class ChatResponse(BaseModel):
    """
    Defines the standard response from chat and data extraction endpoints.
    """
    chat_id: str
    response: Message
    extracted_data: Optional[ExtractedListingData] = None

class JobResponse(BaseModel):
    """Simple response model for endpoints that launch a background job."""
    job_id: str

class FlagItem(BaseModel):
    """
    Represents a single flag with its category and description.
    """
    category: str
    description: str

class FinalReport(BaseModel):
    """
    Schema for the final, synthesized report returned when an analysis is complete.
    """
    authenticity_score: int
    quality_score: int
    sidebar_summary: str
    flags: List[FlagItem]
    chat_explanation: str
    suggested_actions: List[str]

class JobStatusResponse(BaseModel):
    """
    Schema for the analysis status polling endpoint.
    """
    id: uuid.UUID
    status: JobStatus
    final_report: Optional[FinalReport] = None

    class Config:
        """Pydantic config to allow ORM mode for automatic mapping."""
        from_attributes = True

