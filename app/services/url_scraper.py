import logging
import os
import requests
from app.utils.validators import validate_external_url

logger = logging.getLogger(__name__)

FIRECRAWL_API_KEY = os.environ.get("FIRECRAWL_API_KEY")
FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v1"


def scrape_url(url: str) -> dict:
    """
    Scrapes a URL using Firecrawl API and returns markdown content + screenshot.
    Falls back to basic requests if Firecrawl is unavailable.
    """
    validate_external_url(url)

    if FIRECRAWL_API_KEY:
        return _scrape_with_firecrawl(url)
    return _scrape_with_requests(url)


def _scrape_with_firecrawl(url: str) -> dict:
    """Scrape using Firecrawl API — returns markdown and optional screenshot."""
    try:
        response = requests.post(
            f"{FIRECRAWL_BASE_URL}/scrape",
            headers={
                "Authorization": f"Bearer {FIRECRAWL_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "url": url,
                "formats": ["markdown", "screenshot"],
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json().get("data", {})
        return {
            "markdown": data.get("markdown", ""),
            "screenshot_url": data.get("screenshot"),
            "source": "firecrawl",
        }
    except Exception as e:
        logger.warning(f"Firecrawl failed for {url}: {e}. Falling back to requests.")
        return _scrape_with_requests(url)


def _scrape_with_requests(url: str) -> dict:
    """Basic fallback: fetch HTML and extract text (no JS rendering)."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        # Basic text extraction from HTML
        from html.parser import HTMLParser

        class TextExtractor(HTMLParser):
            def __init__(self):
                super().__init__()
                self.texts: list[str] = []
                self._skip = False
                self._skip_tags = {"script", "style", "noscript"}

            def handle_starttag(self, tag: str, attrs: list) -> None:
                if tag in self._skip_tags:
                    self._skip = True

            def handle_endtag(self, tag: str) -> None:
                if tag in self._skip_tags:
                    self._skip = False

            def handle_data(self, data: str) -> None:
                if not self._skip:
                    stripped = data.strip()
                    if stripped:
                        self.texts.append(stripped)

        extractor = TextExtractor()
        extractor.feed(response.text)
        text = "\n".join(extractor.texts)

        return {
            "markdown": text[:10000],
            "screenshot_url": None,
            "source": "requests_fallback",
        }
    except Exception as e:
        logger.error(f"Fallback scrape failed for {url}: {e}")
        return {"markdown": "", "screenshot_url": None, "source": "error", "error": str(e)}
