"""
French Cadastre (land registry) lookup service.
Uses the Geoplateforme Geocodage API (data.geopf.fr).
Only works for French properties (country_code == "fr").
"""

import logging
import requests

logger = logging.getLogger(__name__)

BASE_URL = "https://data.geopf.fr/geocodage"
TIMEOUT = 10


def lookup_by_address(address: str) -> dict:
    """
    Geocodes a French address and returns cadastral information.
    """
    try:
        response = requests.get(
            f"{BASE_URL}/search",
            params={"q": address, "limit": 1},
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        return _parse_response(response.json())
    except Exception as e:
        logger.error(f"France cadastre address lookup failed: {e}")
        return {"found": False, "error": str(e)}


def lookup_by_coordinates(lat: float, lng: float) -> dict:
    """
    Reverse geocodes coordinates to find French cadastral information.
    """
    try:
        response = requests.get(
            f"{BASE_URL}/reverse",
            params={"lat": lat, "lon": lng, "limit": 1},
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        return _parse_response(response.json())
    except Exception as e:
        logger.error(f"France cadastre coordinate lookup failed: {e}")
        return {"found": False, "error": str(e)}


def _parse_response(data: dict) -> dict:
    """Parses the GeoJSON response from Geoplateforme."""
    features = data.get("features", [])
    if not features:
        return {"found": False, "reason": "No cadastral record found at this location."}

    props = features[0].get("properties", {})
    score = props.get("score", 0)

    return {
        "found": True,
        "official_address": props.get("label", ""),
        "city": props.get("city", ""),
        "postcode": props.get("postcode", ""),
        "citycode": props.get("citycode", ""),
        "score": score,
    }
