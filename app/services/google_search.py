# app/services/Google Search.py
from googleapiclient.discovery import build
from app.core.config import settings
import logging
from . import gemini_analysis
logger = logging.getLogger(__name__)

def search_web(query: str, get_count: bool = False) -> dict:
    """
    Performs a web search using the Google Custom Search API.
    Returns snippets or the total result count.
    """
    try:
        service = build("customsearch", "v1", developerKey=settings.GOOGLE_API_KEY)
        
        res = service.cse().list(
            q=query,
            cx=settings.GOOGLE_SEARCH_ENGINE_ID,
            num=3
        ).execute()

        if get_count:
            count = int(res.get('searchInformation', {}).get('totalResults', 0))
            return {"total_results": count}

        if 'items' not in res:
            return {"snippets": ""}

        snippets = [item.get('snippet', '') for item in res['items']]
        return {"snippets": " ".join(snippets)}

    except Exception as e:
        logger.error(f"Google Search API call failed for query '{query}': {e}")
        return {"snippets": "", "total_results": 0}
    
def find_description_duplicates(query: str, get_count: bool = False, exact_match: bool = True) -> dict:
    """
    Performs a web search using the Google Custom Search API.
    Returns snippets or the total result count.
    """
    try:
        # Añade comillas para una búsqueda de frase exacta, crucial para detectar duplicados.
        if exact_match:
            query = f'"{query}"'

        service = build("customsearch", "v1", developerKey=settings.GOOGLE_API_KEY)
        
        res = service.cse().list(
            q=query,
            cx=settings.GOOGLE_SEARCH_ENGINE_ID,
            num=3
        ).execute()

        if get_count:
            count = int(res.get('searchInformation', {}).get('totalResults', 0))
            return {"total_results": count}

        if 'items' not in res:
            return {"snippets": ""}

        snippets = [item.get('snippet', '') for item in res['items']]
        return {"snippets": " ".join(snippets)}

    except Exception as e:
        logger.error(f"Google Search API call failed for query '{query}': {e}")
        # Devuelve una estructura consistente en caso de error
        return {"snippets": "", "total_results": 0}
    
def check_host_reputation(host_name: str) -> dict:
    """
    Performs web searches for a host's name plus negative keywords
    and uses Gemini to analyze the results for reputation red flags.
    """
    if not host_name:
        return {"issue_found": False, "summary": "No host name provided."}

    # Keywords in both English and Spanish
    search_keywords = ['scam', 'fraud', 'complaint', 'estafa', 'fraude', 'queja', 'reviews']
    
    all_snippets = ""
    for keyword in search_keywords:
        query = f'"{host_name}" {keyword}'
        search_result = search_web(query, get_count=False)
        all_snippets += search_result.get("snippets", "") + " "
    
    if not all_snippets.strip():
        return {"issue_found": False, "summary": "No public information or complaints found for the host."}

    # Send the collected snippets to Gemini for analysis
    return gemini_analysis.analyze_host_reputation(all_snippets, host_name)
def check_external_reputation(property_name: str, address_components: list) -> dict:
    """
    Performs multi-lingual web searches for a property's name to find
    negative press, complaints, or scam reports.
    """
    if not property_name:
        return {"issue_found": False, "summary": "No property name to check."}

    # Determine country to use localized keywords
    country_code = 'en' # Default to English
    for component in address_components:
        if 'country' in component.get('types', []):
            country_code = component.get('short_name', 'en').lower()
            break
    
    keyword_map = {
        'en': ['scam', 'fraud', 'complaint', 'review', 'nightmare'],
        'es': ['estafa', 'fraude', 'queja', 'reseña', 'pesadilla']
        # Add more languages as needed
    }

    # Get keywords for the detected country, plus English as a fallback
    keywords_to_search = set(keyword_map.get(country_code, []) + keyword_map['en'])

    all_snippets = ""
    for keyword in keywords_to_search:
        query = f'"{property_name}" {keyword}'
        search_result = search_web(query, get_count=False)
        all_snippets += search_result.get("snippets", "") + " "
    
    if not all_snippets.strip():
        return {"issue_found": False, "summary": "No negative public information found for this property."}

    # Send the collected snippets to Gemini for analysis
    return gemini_analysis.analyze_search_results_for_reputation(all_snippets, property_name)