import json
import logging
import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.db.models import Chat, ChatMessage, FraudCheck, JobStatus
from app.db.session import SessionLocal
from app.schemas import RawExtractedData
from app.services import gemini_analysis
from app.services import data_formatter
from app.utils.helpers import load_prompt
from app.utils.text_sanitizer import sanitize_listing_text

logger = logging.getLogger(__name__)

def extract_and_format_data(content: str) -> dict:
    """
    Takes raw text, calls the AI for extraction, validates, and formats it.
    This function does not interact with the database.
    """
    if not content:
        raise HTTPException(status_code=422, detail="No se pudo extraer información del anuncio. El texto está vacío.")

    # 1. Sanitize and optimize the text (security + noise removal)
    logger.info("[extract] raw input: %d chars", len(content))
    clean_content = sanitize_listing_text(content)
    logger.info("[extract] after sanitization: %d chars", len(clean_content))

    if not clean_content:
        raise HTTPException(status_code=422, detail="No se pudo extraer información del anuncio. El texto no contiene contenido útil.")

    # 2. Call the AI to get the simple, raw data
    raw_data_dict = gemini_analysis.extract_data_from_text(clean_content)
    if "error" in raw_data_dict:
        raise HTTPException(status_code=500, detail=f"AI data extraction failed: {raw_data_dict['error']}")

    logger.info("[extract] Gemini returned keys: %s", list(raw_data_dict.keys()))

    # 3. Validate and format the data
    raw_data_validated = RawExtractedData.model_validate(raw_data_dict)

    if all(v is None for v in raw_data_validated.model_dump().values()):
        raise HTTPException(
            status_code=422,
            detail="No se pudo extraer información del anuncio. Asegúrate de pegar el texto completo del anuncio."
        )

    final_formatted_data = data_formatter.format_extracted_data(raw_data_validated)

    return final_formatted_data