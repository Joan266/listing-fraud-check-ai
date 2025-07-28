import pydantic
from typing import List, Optional, Dict, Any
from app.schemas import ExtractedListingData, RawExtractedData


# --- 2. Create the Formatting Function ---
def format_extracted_data(raw_data: RawExtractedData) -> dict:
    """
    Takes the simple, raw data from the AI and formats it into the final
    structure that the frontend expects.
    """
    # Combine all description parts into a single markdown string
    desc_parts = []
    if raw_data.general_overview:
        desc_parts.append(f"### General Overview\n{raw_data.general_overview}")
    if raw_data.amenities:
        items = "\n".join([f"- {item}" for item in raw_data.amenities])
        desc_parts.append(f"### Amenities\n{items}")
    # ... (add other description parts like notable_features, area_description, etc.)
    final_description = "\n\n".join(desc_parts) if desc_parts else None

    # Combine all price parts into a single string
    # This can be changed later to a structured object if the frontend needs it
    price_parts = []
    if raw_data.base_price_text: price_parts.append(f"Base Price: {raw_data.base_price_text}")
    if raw_data.cleaning_fee: price_parts.append(f"Cleaning Fee: {raw_data.cleaning_fee}")
    if raw_data.service_fee: price_parts.append(f"Service Fee: {raw_data.service_fee}")
    if raw_data.security_deposit: price_parts.append(f"Security Deposit: {raw_data.security_deposit}")
    final_price_details = ", ".join(price_parts) if price_parts else None

    # Build the final dictionary, which matches your ExtractedListingData schema
    final_data = {
        "listing_url": raw_data.listing_url,
        "address": raw_data.address,
        "description": final_description,
        "image_urls": raw_data.image_urls,
        "communication_text": raw_data.communication_text,
        "host_name": raw_data.host_name,
        "email": raw_data.email,
        "phone": raw_data.phone,
        "reviews": raw_data.reviews,
        "price_details": final_price_details,
        "host_profile": raw_data.host_profile,
        "property_type": raw_data.property_type
    }
    
    return final_data