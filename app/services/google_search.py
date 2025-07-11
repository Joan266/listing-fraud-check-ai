# app/services/Google Search.py
from googleapiclient.discovery import build
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def search_web(query: str) -> str:
    """
    Performs a web search using the Google Custom Search API.
    Returns a concatenated string of search result snippets.
    """
    try:
        service = build("customsearch", "v1", developerKey=settings.GOOGLE_API_KEY)
        
        res = service.cse().list(
            q=query,
            cx=settings.GOOGLE_SEARCH_ENGINE_ID,# Custom Search Engine ID
            num=3  # Get top 3 results for efficiency
        ).execute()

        if 'items' not in res:
            return ""

        snippets = [item.get('snippet', '') for item in res['items']]
        return " ".join(snippets)

    except Exception as e:
        logger.error(f"Google Search API call failed for query '{query}': {e}")
        return "" # Return empty string on error to not block the process