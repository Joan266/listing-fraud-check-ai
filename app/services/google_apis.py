# app/services/google_apis.py
import googlemaps
from app.core.config import settings
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# The full list of fields we want for our analysis
relevant_fields = relevant_fields = [
    # Core Identification
    "place_id",
    "name",
    "formatted_address",
    "address_component", 
    "url",               

    # Location
    "geometry",          

    # Key Fraud Signals
    "business_status",
    "type",             
    "rating",
    "user_ratings_total",
    "reviews"            
]


# Configure clients once
try:
    gmaps = googlemaps.Client(key=settings.GOOGLE_API_KEY)
except Exception as e:
    logger.error(f"Failed to initialize Google Maps client: {e}")
    gmaps = None

# In a file like app/services/google_apis.py

def validate_address_and_get_place_details(address: str) -> dict:
    """
    Validates an address and gets rich details, gracefully handling partial matches.
    """
    if not gmaps:
        return {"error": "Google Maps client not initialized."}

    try:
        geocode_result = gmaps.geocode(address)

        # Handle case where Google finds nothing at all
        if not geocode_result:
            return {
                "validation_result": "NO_MATCH",
                "address_provided": address,
                "error": "Address not found by Google Geocoding."
            }

        first_result = geocode_result[0]
        
        # --- Build the base report with whatever we have ---
        report = {
            "validation_result": "PERFECT_MATCH" if not first_result.get('partial_match') else "PARTIAL_MATCH",
            "address_provided": address,
            "formatted_address": first_result.get('formatted_address'),
            "coordinates": first_result.get('geometry', {}).get('location'),
            "error": None
        }

        # --- Try to get richer details using the Place ID ---
        place_id = first_result.get('place_id')
        if place_id:
            place_details = gmaps.place(place_id=place_id, fields=relevant_fields).get('result', {})
            
            report.update(place_details)
        else:
            report["error"] = "Geocoded address has no Place ID, details may be limited."

        return report

    except Exception as e:
        return {"error": f"An unexpected error occurred in Google API call: {e}"}