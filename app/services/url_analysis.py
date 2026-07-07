import whois
import requests
import concurrent.futures
from datetime import datetime, timedelta
from urllib.parse import urlparse

WHOIS_TIMEOUT_SECONDS = 10


def _whois_lookup(domain_name: str):
    """Runs whois.whois in a thread with timeout protection."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(whois.whois, domain_name)
        return future.result(timeout=WHOIS_TIMEOUT_SECONDS)


def check_domain_age(domain_name: str) -> dict:
    """Checks the creation date of a domain."""
    try:
        w = _whois_lookup(domain_name)
        creation_date = w.creation_date[0] if isinstance(w.creation_date, list) else w.creation_date
        if not creation_date:
            return {"is_new": False, "reason": "Could not determine creation date."}
        
        is_new = datetime.now() - creation_date < timedelta(days=90)
        return {
            "is_new": is_new,
            "reason": f"Domain was created on {creation_date.strftime('%Y-%m-%d')}"
        }
    except Exception as e:
        return {"is_new": False, "reason": f"Whois lookup failed: {e}"}

def check_url_blacklist(url: str) -> dict:
    """
    Checks a URL against the Google Safe Browsing API.
    Requires GOOGLE_SAFE_BROWSING_API_KEY env var.
    Falls back to SKIPPED if key is not configured.
    """
    import os
    api_key = os.environ.get("GOOGLE_SAFE_BROWSING_API_KEY")
    if not api_key:
        return {
            "is_blacklisted": False,
            "reason": "Safe Browsing check skipped (API key not configured)."
        }
    try:
        payload = {
            "client": {"clientId": "fraudcheck", "clientVersion": "1.0"},
            "threatInfo": {
                "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}],
            },
        }
        response = requests.post(
            f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={api_key}",
            json=payload,
            timeout=10,
        )
        response.raise_for_status()
        matches = response.json().get("matches", [])
        is_blacklisted = len(matches) > 0
        return {
            "is_blacklisted": is_blacklisted,
            "reason": "URL flagged by Google Safe Browsing." if is_blacklisted else "URL not found on blacklists.",
        }
    except Exception as e:
        return {"is_blacklisted": False, "reason": f"Safe Browsing check failed: {e}"}

def check_archive_history(url: str) -> dict:
    """Checks if a URL has a history on the Wayback Machine."""
    try:
        api_url = f"http://archive.org/wayback/available?url={url}"
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        has_history = bool(data.get("archived_snapshots"))
        return {
            "has_history": has_history,
            "reason": "URL has an archive history." if has_history else "URL has no archive history."
        }
    except Exception as e:
        return {"has_history": False, "reason": f"Archive check failed: {e}"}