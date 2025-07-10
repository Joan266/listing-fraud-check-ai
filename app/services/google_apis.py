# app/services/google_apis.py
import googlemaps
from app.core.config import settings
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
relevant_fields = [
    # Basic Data
    'address_component',
    'adr_address',
    'business_status',
    'formatted_address',
    'geometry/location', 
    'name',
    'photo', 
    'place_id',
    'type', 
    'url',
    
    # Contact Data
    'international_phone_number',
    'opening_hours',
    'website',

    # Atmosphere Data
    'rating',
    'review', 
    'user_ratings_total' 
]

# Configure clients once
try:
    gmaps = googlemaps.Client(key=settings.GOOGLE_API_KEY)
    # help(gmaps)
except Exception as e:
    logger.error(f"Failed to initialize Google Maps client: {e}")
    gmaps = None

def validate_address_and_get_place_details(address: str) -> dict:
    """
    Validates an address and gets details using the new Places API.
    """
    if not gmaps:
        return {"error": "Google Maps client not initialized. Check API Key."}

    report = {
        "validation_result": "NO_MATCH",
        "address_provided": address,
        "formatted_address": None,
        "coordinates": None,
        "place_id": None,
        "place_types": [],
        "place_rating": None,
        "place_user_ratings_total": None,
        "error": None
    }

    try:
        # Step 1: Geocode the address (this part remains the same)
        geocode_result = gmaps.geocode(address)
        if not geocode_result:
            report["error"] = "Address not found by Google Geocoding."
            report["validation_result"] = "NO_MATCH"
            return report

        if geocode_result[0].get('partial_match'):
            report["validation_result"] = "PARTIAL_MATCH"
        else:
            report["validation_result"] = "PERFECT_MATCH"

        location = geocode_result[0]['geometry']['location']
        report["coordinates"] = location
        report["formatted_address"] = geocode_result[0]['formatted_address']
        
        place_id = geocode_result[0].get('place_id')
        if not place_id:
            report["error"] = "Geocoded address has no Place ID."
            return report

        # Step 2: Use Place ID to get rich details from the NEW Places API
        report["place_id"] = place_id
        
        # Define the fields you want using the new 'Field Mask' format
        fields = relevant_fields
        # Call the same gmaps.place function, but the structure of the result is different
        # The library handles routing to the correct API endpoint based on parameters.
        place_details = gmaps.place(place_id=place_id, fields=fields)
        
        if place_details.get('result'):
            result = place_details['result']
            report["place_types"] = result.get('types', [])
            report["place_rating"] = result.get('rating')
            # Note the name change from 'user_ratings_total' to 'userRatingCount'
            report["place_user_ratings_total"] = result.get('userRatingCount')

    except googlemaps.exceptions.ApiError as e:
        logger.error(f"Google Maps API error: {e}")
        report["error"] = f"Google Maps API error: {e.body if hasattr(e, 'body') else str(e)}"
    except Exception as e:
        logger.error(f"An unexpected error occurred in google_apis: {e}")
        report["error"] = f"An unexpected error occurred: {e}"

    return report