import pydantic
from typing import List, Optional, Dict, Any
from app.schemas import ExtractedListingData, RawExtractedData


# --- 2. Create the Formatting Function ---
def format_extracted_data(raw_data: RawExtractedData) -> dict:
    """
    Takes the simple, raw data from the AI and formats it into the final
    structure that the frontend expects.
    """
    # --- Combine all description parts into a single markdown string ---
    desc_parts = []
    if raw_data.general_overview:
        desc_parts.append(f"### General Overview\n{raw_data.general_overview}")
    if raw_data.amenities:
        items = "\n".join([f"- {item}" for item in raw_data.amenities])
        desc_parts.append(f"### Amenities\n{items}")
    if raw_data.notable_features:
        items = "\n".join([f"- {item}" for item in raw_data.notable_features])
        desc_parts.append(f"### Notable Features\n{items}")
    if raw_data.area_description:
        desc_parts.append(f"### Area Description\n{raw_data.area_description}")
    if raw_data.rules_and_restrictions:
        items = "\n".join([f"- {item}" for item in raw_data.rules_and_restrictions])
        desc_parts.append(f"### Rules & Restrictions\n{items}")
    if raw_data.suspicious_notes:
        items = "\n".join([f"- {item}" for item in raw_data.suspicious_notes])
        desc_parts.append(f"### Suspicious Notes\n{items}")
    
    final_description = "\n\n".join(desc_parts) if desc_parts else None

    # --- Combine all price parts into a single string ---
    price_parts = []
    if raw_data.base_price_text:
        price_parts.append(f"Base Price: {raw_data.base_price_text}")
    if raw_data.cleaning_fee:
        price_parts.append(f"Cleaning Fee: {raw_data.cleaning_fee}")
    if raw_data.service_fee:
        price_parts.append(f"Service Fee: {raw_data.service_fee}")
    if raw_data.security_deposit:
        price_parts.append(f"Security Deposit: {raw_data.security_deposit}")
    # You can add taxes, discounts, etc. here as well

    final_price_details = ", ".join(price_parts) if price_parts else None

    # --- Build the final dictionary ---
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