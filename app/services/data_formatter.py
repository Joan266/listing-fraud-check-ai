import pydantic
from typing import List, Optional, Dict, Any
from app.schemas import ExtractedListingData, RawExtractedData


# --- 2. Create the Formatting Function ---
def format_extracted_data(raw_data: RawExtractedData) -> dict:
    """
    Takes the simple, raw data from the AI and formats it into the final
    structure that the frontend expects.
    """
  

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
    if raw_data.taxes:
        price_parts.append(f"Taxes: {raw_data.taxes}")
    if raw_data.discounts_text:
        price_parts.append(f"Discounts: {raw_data.discounts_text}")
    if raw_data.payment_terms_text:
        price_parts.append(f"Payment Terms: {raw_data.payment_terms_text}")

    final_price_details = ", ".join(price_parts) if price_parts else None

    # --- Build the final dictionary ---
    final_data = {
        "listing_url": raw_data.listing_url,
        "address": raw_data.address,
        "description": raw_data.description,
        "image_urls": raw_data.image_urls,
        "communication_text": raw_data.communication_text,
        "host_email": raw_data.host_email,
        "host_phone": raw_data.host_phone,
        "reviews": raw_data.reviews,
        "price_details": final_price_details,
        "host_profile": raw_data.host_profile,
        "property_type": raw_data.property_type
    }
    
    return final_data