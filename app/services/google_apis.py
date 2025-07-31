import concurrent
import googlemaps
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Configure client once
try:
    gmaps = googlemaps.Client(key=settings.GOOGLE_API_KEY)
except Exception as e:
    logger.error(f"Failed to initialize Google Maps client: {e}")
    gmaps = None
# in app/services/google_apis.py
def geocode_address(address: str) -> dict:
    """
    Performs the geocoding step, formats the result, extracts the country code,
    and returns a single, clean dictionary.
    """
    if not gmaps:
        return {"error": "Google Maps client not initialized."}
    try:
        geocode_result = gmaps.geocode(address)
        if not geocode_result:
            return {"error": "Address not found."}
        
        first_result = geocode_result[0]
        
        # 1. Build the clean report object
        report = {
            "validation_result": "PERFECT_MATCH" if not first_result.get('partial_match') else "PARTIAL_MATCH",
            "address_provided": address,
            "formatted_address": first_result.get('formatted_address'),
            "coordinates": first_result.get('geometry', {}).get('location'),
            "place_id": first_result.get('place_id'),
            "types": first_result.get('types', [])
        }

        # 2. Extract and add the country code
        country_code = 'us' # Default
        address_components = first_result.get('address_components', [])
        for component in address_components:
            if 'country' in component.get('types', []):
                country_code = component.get('short_name', 'us').lower()
                break
        report['country_code'] = country_code
        
        return report

    except Exception as e:
        logger.error(f"Geocode API call failed for address '{address}': {e}")
        return {"error": f"An unexpected error occurred during geocoding: {e}"}
    
def get_place_details(place_id: str) -> dict:
    """Performs the Place Details lookup."""
    if not gmaps:
        return {"error": "Google Maps client not initialized."}
    try: 
        essential_fields = [
            "place_id",
            "name",
            "formatted_address",
            "address_component",
            "url",
            "geometry",
            "business_status",
            "type",
            "rating",
            "user_ratings_total",
            "reviews",
            "editorial_summary" # 
        ]
        return gmaps.place(place_id=place_id, fields=essential_fields).get('result', {})
    
    except Exception as e:
        logger.error(f"Google API call failed: {e}", exc_info=True)
        return {"error": f"An unexpected error occurred in Google API call: {e}"}

def get_neighborhood_analysis(coordinates: dict) -> dict:
    """
    Performs parallel Nearby Searches and returns a summary including the
    name and location of each place found.
    """
    if not gmaps or not coordinates:
        return {}

    search_types = {
        "supermarkets": "supermarket",
        "parks": "park",
        "transit_stations": "transit_station",
        "restaurants": "restaurant",
    }
    
    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(search_types)) as executor:
        future_to_type = {
            executor.submit(
                gmaps.places_nearby, 
                location=coordinates, 
                radius=1000, 
                type=place_type
            ): key 
            for key, place_type in search_types.items()
        }
        for future in concurrent.futures.as_completed(future_to_type):
            key = future_to_type[future]
            try:
                places = future.result().get('results', [])
                
                results[key] = {
                    "count": len(places),
                    "places": [
                        {
                            "name": place.get("name"),
                            "location": place.get("geometry", {}).get("location")
                        }
                        for place in places
                    ]
                }
            except Exception as e:
                logger.error(f"Nearby Search for '{key}' failed: {e}")
                results[key] = {"count": 0, "places": []}
                
    return results