from pydantic import BaseModel, ConfigDict
import uuid
from app.db.models import JobStatus

# --- Data Schemas ---

class ExtractedListingData(BaseModel):
    listing_url: str | None = None 
    address: str | None = None
    description: str | None = None
    image_urls: list[str] | None = None
    communication_text: str | None = None
    host_name: str | None = None
    email: str | None = None
    phone: str | None = None
    reviews: list[dict] | None = None
    price_details: dict | None = None
    host_profile: dict | None = None
    property_type: str | None = None

class ChatMessageSchema(BaseModel):
    role: str
    content: str

# --- Request Schemas ---

class FraudCheckRequest(ExtractedListingData): # Inherits all fields from above
    """
    Defines the structure of the data the client sends to start the main analysis.
    """
    session_id: str 
    chat_history: list[dict] | None = None

class ChatRequest(BaseModel):
    session_id: str | None = None
    message: ChatMessageSchema

# --- Response Schemas ---

class JobResponse(BaseModel):
    job_id: str

class ChatResponse(BaseModel):
    chat_id: str
    response: ChatMessageSchema
    extracted_data: ExtractedListingData | None = None
    geocode_job_id: str | None = None

class JobStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: JobStatus
    input_data: dict
    final_report: dict | None = None