from pydantic import BaseModel, ConfigDict
import uuid
from app.db.models import JobStatus # Import the Enum from your models

# --- Request Schemas ---

class FraudCheckRequest(BaseModel):
    """
    Defines the structure of the data the client sends to start an analysis.
    All fields are optional to allow for maximum flexibility.
    """
    rawListing: str | None = None
    address: str | None = None
    description: str | None = None
    image_urls: list[str] | None = None
    communication_text: str | None = None
    host_name: str | None = None
    # Add any other specific fields you expect from the user

# --- Response Schemas ---

class JobResponse(BaseModel):
    """
    The immediate response after a job is successfully enqueued.
    """
    job_id: str

class JobStatusResponse(BaseModel):
    """
    The response for the status/result polling endpoint.
    It maps directly to the FraudCheck database model.
    """
    # This tells Pydantic to create the model from object attributes (like SQLAlchemy models)
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: JobStatus
    input_data: dict
    final_report: dict | None = None