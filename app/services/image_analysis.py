import json
import logging
import requests
import io
from PIL import Image
from app.services import gemini_analysis
from app.utils.helpers import load_prompt
from google.cloud import vision

logger = logging.getLogger(__name__)

try:
    vision_client = vision.ImageAnnotatorClient()
except Exception as e:
    logger.error(f"Failed to initialize Vision client in image_analysis: {e}")
    vision_client = None

def reverse_image_search(image_url: str) -> dict:
    """
    Performs an intelligent reverse image search by using an AI to classify
    the pages where matching images are found.
    """
    if not vision_client:
        return {"url": image_url, "is_reused": False, "error": "Vision client not initialized."}

    try:
        image = vision.Image()
        image.source.image_uri = image_url
        response = vision_client.web_detection(image=image)
        detection = response.web_detection

        has_full_matches = bool(detection.full_matching_images)
        has_page_matches = bool(detection.pages_with_matching_images)

        full_match_urls = [img.url for img in detection.full_matching_images]
        logger.info(
            "[reverse_image_search] url=%s full_matches=%d page_matches=%d",
            image_url,
            len(detection.full_matching_images),
            len(detection.pages_with_matching_images),
        )
        logger.info("[reverse_image_search] full_match_image_urls=%s", full_match_urls)

        if not has_full_matches and not has_page_matches:
            return {
                "is_reused": False,
                "reason": "Image appears to be unique.",
                "url": image_url
            }

        # Without full (pixel-exact) matches, only visual similarity was found —
        # not enough evidence to flag as reused.
        if not has_full_matches:
            return {
                "is_reused": False,
                "reason": "Image found on other sites as a visual similarity only, not an exact copy.",
                "url": image_url
            }

        # Known rental/travel platform domains — exact copies here mean multi-platform, not fraud
        _RENTAL_DOMAINS = (
            "muscache.com",       # Airbnb CDN
            "airbnb.com",
            "bstatic.com",        # Booking.com CDN
            "booking.com",
            "vrbo.com",
            "homeaway.com",
            "expedia.com",
            "tripadvisor.com",
            "hometogo.com",
            "holidu.com",
            "ruralia.com",
        )

        from urllib.parse import urlparse
        full_match_domains = {urlparse(img.url).netloc for img in detection.full_matching_images}
        external_matches = [
            d for d in full_match_domains
            if not any(d.endswith(rental) for rental in _RENTAL_DOMAINS)
        ]

        if not external_matches:
            # All exact copies are on known rental platforms — same host, multi-platform
            return {
                "is_reused": False,
                "reason": "Image found on other rental platforms — likely the same host listing on multiple sites.",
                "url": image_url
            }

        # Exact copies found on non-rental domains — flag directly without Gemini
        # (passing all pages_with_matching_images to Gemini caused false positives
        # because it included YouTube/news pages that Gemini classified as suspicious)
        logger.info("[reverse_image_search] external full-match domains: %s", external_matches)
        suspicious_urls = [
            img.url for img in detection.full_matching_images
            if urlparse(img.url).netloc in set(external_matches)
        ]
        return {
            "is_reused": True,
            "reason": f"Exact copy of this image found on {len(external_matches)} non-rental site(s): {', '.join(list(external_matches)[:3])}.",
            "suspicious_urls": suspicious_urls or list(external_matches),
            "url": image_url
        }
    except Exception as e:
        logger.error(f"Cloud Vision API call failed for url {image_url}: {e}")
        return {"is_reused": False, "reason": "Error during reverse image search.", "url": image_url}
    
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB

def check_for_ai_artifacts(image_url: str) -> dict:
    """
    Downloads, resizes, and then calls the Gemini service to analyze an image.
    """
    from app.utils.validators import validate_external_url
    try:
        validate_external_url(image_url)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.google.com/'
        }
        image_response = requests.get(image_url, stream=True, headers=headers, timeout=10)
        image_response.raise_for_status()

        content_length = int(image_response.headers.get('Content-Length', 0))
        if content_length > MAX_IMAGE_SIZE:
            return {"confidence_score": 0.0, "verdict": "Skipped", "artifacts": ["Image too large."], "url": image_url}

        # --- Image Resizing Logic ---
        image = Image.open(io.BytesIO(image_response.content))
        target_size = (1024, 1024)
        image.thumbnail(target_size, Image.Resampling.LANCZOS)
        
        byte_buffer = io.BytesIO()
        image.convert("RGB").save(byte_buffer, format="JPEG")
        resized_image_bytes = byte_buffer.getvalue()

        image_data = {
            "mime_type": "image/jpeg",
            "data": resized_image_bytes
        }

        result = gemini_analysis.analyze_image_for_ai(image_data)
        
        result['url'] = image_url
        return result

    except Exception as e:
        logger.error(f"Gemini image analysis failed for url {image_url}: {e}")
        return {
            "confidence_score": 0.0,
            "verdict": "Error",
            "artifacts": [f"Error during analysis: {str(e)}"],
            "url": image_url
        }