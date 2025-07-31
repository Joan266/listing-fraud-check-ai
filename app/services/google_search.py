# app/services/Google Search.py
from googleapiclient.discovery import build
from app.core.config import settings
import logging

# Create the service client once to be reused. This is more efficient.
try:
    search_service = build("customsearch", "v1", developerKey=settings.GOOGLE_API_KEY)
except Exception as e:
    logging.error(f"Failed to build Google Search service client: {e}")
    search_service = None

def search_web(query: str, exact_match: bool = False) -> list[dict]:
    """
    Performs a single web search and returns a list of result items.
    Each item is a dictionary containing title, link, and snippet.
    """
    if not search_service:
        return []
    
    search_query = f'"{query}"' if exact_match else query
    print("Query: ",search_query)
    try:
        res = search_service.cse().list(
            q=search_query,
            cx=settings.GOOGLE_SEARCH_ENGINE_ID,
            num=3
        ).execute()

        if 'items' not in res:
            return []
        
        # Return a list of dictionaries with the key information
        return [
            {
                "title": item.get("title"),
                "link": item.get("link"),
                "snippet": item.get("snippet")
            } 
            for item in res.get("items", [])
        ]
    except Exception as e:
        logging.error(f"Google Search API call failed for query '{search_query}': {e}")
        return []

# in app/services/Google Search.py
import pycountry

def prepare_reputation_queries(inputs: dict, query_limit: int = 8) -> list[str]:
    """
    Generates a targeted list of high-impact search queries using localized keywords.
    """
    # --- Localized Keyword Map ---
    keyword_map = {
        'en': ['scam', 'fraud'],
        'es': ['estafa', 'fraude'],
        'fr': ['arnaque', 'fraude'],
        'pt': ['fraude', 'golpe'],
        'de': ['betrug', 'beschwerde'],
        'it': ['truffa', 'frode'],
    }
    
    # --- Get Languages for the Country ---
    country_code = inputs.get('country_code', 'us').lower()
    languages_to_use = set(['en']) # Default to English
    try:
        # Get all official language codes for the country
        country_data = pycountry.countries.get(alpha_2=country_code.upper())
        if country_data:
            for lang in country_data.languages:
                languages_to_use.add(lang.alpha_2)
    except (AttributeError, KeyError):
        pass # Stick with English if country isn't found

    # --- Build the Keyword List ---
    keywords_to_search = set()
    for lang_code in languages_to_use:
        keywords_to_search.update(keyword_map.get(lang_code, []))
    
    # --- Generate Queries ---
    queries = []
    # Prioritize unique identifiers
    search_terms = [inputs.get("host_email"), inputs.get("host_phone")]

    for term in search_terms:
        if term:
            for keyword in keywords_to_search:
                queries.append(f'"{term}" {keyword}')
    
    return list(set(queries))[:query_limit]