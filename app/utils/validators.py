import ipaddress
import re
from urllib.parse import urlparse


# Private/reserved IP ranges and metadata endpoints to block (SSRF prevention)
_BLOCKED_HOSTS = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "metadata.google.internal",
    "169.254.169.254",
}


def validate_external_url(url: str) -> str:
    """
    Validates that a URL is a safe external HTTP(S) URL.
    Blocks private IPs, localhost, and cloud metadata endpoints.
    Returns the validated URL or raises ValueError.
    """
    if not url or not isinstance(url, str):
        raise ValueError("URL must be a non-empty string.")

    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"URL scheme '{parsed.scheme}' not allowed. Use http or https.")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL has no hostname.")

    if hostname in _BLOCKED_HOSTS:
        raise ValueError(f"Blocked host: {hostname}")

    # Block private/reserved IPs
    try:
        ip = ipaddress.ip_address(hostname)
    except ValueError:
        # hostname is not an IP — that's fine, it's a domain name
        pass
    else:
        if ip.is_private or ip.is_reserved or ip.is_loopback or ip.is_link_local:
            raise ValueError(f"Private/reserved IP not allowed: {hostname}")

    return url


def sanitize_user_text(text: str) -> str:
    """
    Strips null bytes and control characters from user-provided text.
    Preserves newlines, tabs, and normal whitespace.
    """
    if not text:
        return ""
    # Remove null bytes
    text = text.replace("\x00", "")
    # Remove control chars except \n, \r, \t
    text = re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    return text
