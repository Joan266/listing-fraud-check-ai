import googlemaps
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# The full list of fields we want for our analysis
essential_fields = [
    "place_id", "name", "formatted_address", "address_component", "url",
    "geometry", "business_status", "type", "rating",
    "user_ratings_total", "reviews"
]

# Configure client once
try:
    gmaps = googlemaps.Client(key=settings.GOOGLE_API_KEY)
except Exception as e:
    logger.error(f"Failed to initialize Google Maps client: {e}")
    gmaps = None

def validate_address_and_get_place_details(address: str) -> dict:
    """
    Validates an address and gets all relevant details in a structured way.
    """
    if not gmaps:
        return {"error": "Google Maps client not initialized."}

    try:
        # 1. Perform the initial geocode
        geocode_result = gmaps.geocode(address)
        if not geocode_result:
            return {
                "validation_result": "NO_MATCH",
                "error": "Address not found by Google Geocoding."
            }
        
        first_result = geocode_result[0]

        # 2. Build the base report from the geocode result
        report = {
            "validation_result": "PERFECT_MATCH" if not first_result.get('partial_match') else "PARTIAL_MATCH",
            "address_provided": address,
            "formatted_address": first_result.get('formatted_address'),
            "coordinates": first_result.get('geometry', {}).get('location'),
            "address_components": first_result.get('address_components', [])
        }

        # 3. Extract the country code for convenience
        country_code = 'us' # Default
        for component in report['address_components']:
            if 'country' in component.get('types', []):
                country_code = component.get('short_name', 'us').lower()
                break
        report['country_code'] = country_code

        # 4. If a Place ID exists, fetch and merge the rich place details
        place_id = first_result.get('place_id')
        if place_id:
            # CRITICAL: Always specify the 'fields' to control costs
            place_details = gmaps.place(place_id=place_id, fields=essential_fields).get('result', {})
            report.update(place_details)

        return report

    except Exception as e:
        logger.error(f"Google API call failed: {e}", exc_info=True)
        return {"error": f"An unexpected error occurred in Google API call: {e}"}
    
def get_neighborhood_analysis(coordinates: dict) -> dict:
    """
    Performs parallel Nearby Searches for key place types around a location.
    """
    if not gmaps or not coordinates:
        return {}

    # Define the types of places to search for
    search_types = {
        "supermarkets": "supermarket",
        "parks": "park",
        "transit_stations": "transit_station",
        "restaurants": "restaurant",
        "nightlife": "night_club",
        "gyms": "gym",
        "pharmacies": "pharmacy"
    }
    
    results = {}
    # Use a ThreadPool to run all searches concurrently for speed
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(search_types)) as executor:
        future_to_type = {
            executor.submit(
                gmaps.places_nearby, 
                location=coordinates, 
                radius=1000, # Search within a 1km radius
                type=place_type
            ): key 
            for key, place_type in search_types.items()
        }
        for future in concurrent.futures.as_completed(future_to_type):
            key = future_to_type[future]
            try:
                # We only care about the *count* of nearby places
                results[key] = len(future.result().get('results', []))
            except Exception as e:
                logger.error(f"Nearby Search for '{key}' failed: {e}")
                results[key] = 0
                
    return results