import json
import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.db.models import Chat, ChatMessage, FraudCheck, JobStatus
from app.db.session import SessionLocal
from app.schemas import ExtractedListingData, RawExtractedData
from app.services import gemini_analysis
from app.services import data_formatter
from app.utils.helpers import load_prompt

def extract_and_format_data(content: str) -> dict:
    """
    Takes raw text, calls the AI for extraction, validates, and formats it.
    This function does not interact with the database.
    """
    if not content:
        return {}

    # 1. Call the AI to get the simple, raw data
    raw_data_dict = gemini_analysis.extract_data_from_text(content)
    if "error" in raw_data_dict:
        raise HTTPException(status_code=500, detail=f"AI data extraction failed: {raw_data_dict['error']}")
    
    # 2. Validate and format the data
    raw_data_validated = RawExtractedData.model_validate(raw_data_dict)
    final_formatted_data = data_formatter.format_extracted_data(raw_data_validated)
    
    return final_formatted_data
