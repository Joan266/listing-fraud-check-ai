import whois
import requests
from datetime import datetime, timedelta
from urllib.parse import urlparse

def check_domain_age(domain_name: str) -> dict:
    """Checks the creation date of a domain."""
    try:
        w = whois.whois(domain_name)
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
    """Checks a URL against the Google Safe Browse API (requires an API key)."""
    # Placeholder: In a real implementation, you would call the Safe Browse API.
    # For now, we'll simulate a clean result.
    is_blacklisted = "badsite.com" in url # Simple simulation
    return {
        "is_blacklisted": is_blacklisted,
        "reason": "URL is on a known blacklist." if is_blacklisted else "URL not found on blacklists."
    }

def check_archive_history(url: str) -> dict:
    """Checks if a URL has a history on the Wayback Machine."""
    try:
        api_url = f"http://archive.org/wayback/available?url={url}"
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()
        
        has_history = bool(data.get("archived_snapshots"))
        return {
            "has_history": has_history,
            "reason": "URL has an archive history." if has_history else "URL has no archive history."
        }
    except Exception as e:
        return {"has_history": False, "reason": f"Archive check failed: {e}"}