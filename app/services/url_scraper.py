import logging
import os
import requests
from app.utils.validators import validate_external_url

logger = logging.getLogger(__name__)

FIRECRAWL_API_KEY = os.environ.get("FIRECRAWL_API_KEY")
FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v1"

# Anti-bot indicators in page content
_BLOCK_SIGNALS = [
    "captcha", "cloudflare", "datadome", "access denied",
    "please verify", "are you a robot", "bot detection",
    "challenge-platform", "ray id", "cf-browser-verification",
]

# Minimum chars for a real listing page (not a block/error page)
_MIN_USEFUL_CONTENT = 200


def scrape_url(url: str) -> dict:
    """
    Scrapes a URL and returns markdown content + optional screenshot.
    Priority: Firecrawl (API) -> Playwright (local headless browser) -> requests (static HTML).
    All failures return a clear result with source="blocked" so the frontend can guide the user.
    """
    validate_external_url(url)

    if FIRECRAWL_API_KEY:
        return _scrape_with_firecrawl(url)
    return _scrape_with_playwright(url)


def _is_blocked(text: str) -> bool:
    """Detect anti-bot pages (Cloudflare, DataDome, captchas)."""
    if not text or len(text) < _MIN_USEFUL_CONTENT:
        return True
    lower = text.lower()
    return any(signal in lower for signal in _BLOCK_SIGNALS)


def _blocked_result(url: str, reason: str) -> dict:
    """Standard result when scraping is blocked by the target site."""
    logger.warning(f"Scrape blocked for {url}: {reason}")
    return {
        "markdown": "",
        "screenshot_url": None,
        "source": "blocked",
        "blocked_reason": reason,
    }


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
        markdown = data.get("markdown", "")

        if _is_blocked(markdown):
            return _blocked_result(url, "Firecrawl returned blocked/empty content")

        return {
            "markdown": markdown,
            "screenshot_url": data.get("screenshot"),
            "source": "firecrawl",
        }
    except Exception as e:
        logger.warning(f"Firecrawl failed for {url}: {e}. Falling back to Playwright.")
        return _scrape_with_playwright(url)


def _scrape_with_playwright(url: str) -> dict:
    """Scrape using a local headless Chromium browser — renders JS like a real user."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.warning("Playwright not installed. Falling back to requests.")
        return _scrape_with_requests(url)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                           "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                locale="es-ES",
            )
            page = context.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(2000)

            # Dismiss cookie banners / overlays (best-effort)
            for selector in [
                "button:has-text('Aceptar')", "button:has-text('Accept')",
                "button:has-text('Agree')", "[id*='cookie'] button",
                "[class*='cookie'] button", "[id*='consent'] button",
            ]:
                try:
                    btn = page.locator(selector).first
                    if btn.is_visible(timeout=500):
                        btn.click(timeout=1000)
                        page.wait_for_timeout(500)
                        break
                except Exception:
                    continue

            # Scroll down to trigger lazy-loaded content
            for _ in range(5):
                page.keyboard.press("End")
                page.wait_for_timeout(500)
            page.keyboard.press("Home")
            page.wait_for_timeout(500)

            # Extract visible text from the body
            text = page.inner_text("body", timeout=5000)

            # Clean up excessive whitespace
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            cleaned = "\n".join(lines)

            browser.close()

        if _is_blocked(cleaned):
            return _blocked_result(url, "Site blocked automated access (captcha/anti-bot)")

        return {
            "markdown": cleaned[:30000],
            "screenshot_url": None,
            "source": "playwright",
        }
    except Exception as e:
        logger.warning(f"Playwright scrape failed for {url}: {e}. Falling back to requests.")
        return _scrape_with_requests(url)


def _scrape_with_requests(url: str) -> dict:
    """Basic fallback: fetch HTML and extract text (no JS rendering)."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

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

        if _is_blocked(text):
            return _blocked_result(url, "Site blocked automated access")

        return {
            "markdown": text[:10000],
            "screenshot_url": None,
            "source": "requests_fallback",
        }
    except Exception as e:
        logger.error(f"All scrape methods failed for {url}: {e}")
        return _blocked_result(url, f"All scrape methods failed: {e}")
