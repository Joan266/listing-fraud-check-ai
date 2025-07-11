# app/services/google_apis.py
import googlemaps
from app.core.config import settings
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# The full list of fields we want for our analysis
relevant_fields = [
    'address_component', 'adr_address', 'business_status', 'formatted_address',
    'geometry/location', 'name', 'photo', 'place_id', 'type', 'url',
    'international_phone_number', 'opening_hours', 'website',
    'rating', 'reviews', 'user_ratings_total'
]

# Configure clients once
try:
    gmaps = googlemaps.Client(key=settings.GOOGLE_API_KEY)
except Exception as e:
    logger.error(f"Failed to initialize Google Maps client: {e}")
    gmaps = None

def validate_address_and_get_place_details(address: str) -> dict:
    """
    Validates an address and gets rich details from the Google Places API.
    """
    if not gmaps:
        return {"error": "Google Maps client not initialized. Check API Key."}

    try:
        # Step 1: Geocode the address
        geocode_result = gmaps.geocode(address)
        if not geocode_result:
            return {
                "validation_result": "NO_MATCH",
                "address_provided": address,
                "error": "Address not found by Google Geocoding."
            }
            
        # --- Start with a base report containing our initial findings ---
        initial_data = {
            "validation_result": "PERFECT_MATCH" if not geocode_result[0].get('partial_match') else "PARTIAL_MATCH",
            "address_provided": address,
            "coordinates": geocode_result[0]['geometry']['location'],
            "error": None
        }

        place_id = geocode_result[0].get('place_id')
        if not place_id:
            initial_data["error"] = "Geocoded address has no Place ID."
            return initial_data

        # Step 2: Use Place ID to get rich details
        place_details_result = gmaps.place(place_id=place_id, fields=relevant_fields)
        
        # --- Merge the rich details from Google with our initial findings ---
        # The 'result' from Google becomes our new base
        final_report = place_details_result.get('result', {})
        
        # Update it with the data we already gathered
        final_report.update(initial_data)

        return final_report

    except googlemaps.exceptions.ApiError as e:
        logger.error(f"Google Maps API error: {e}")
        return {"error": f"Google Maps API error: {e.body if hasattr(e, 'body') else str(e)}"}
    except Exception as e:
        logger.error(f"An unexpected error occurred in google_apis: {e}")
        return {"error": f"An unexpected error occurred: {e}"}