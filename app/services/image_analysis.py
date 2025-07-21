from google.cloud import vision
import google.generativeai as genai
from app.core.config import settings
from app.utils.helpers import load_prompt
import logging
import requests
import json

logger = logging.getLogger(__name__)

# Initialize clients once for efficiency
try:
    vision_client = vision.ImageAnnotatorClient()
    genai.configure(api_key=settings.GOOGLE_GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash-latest')
except Exception as e:
    logger.error(f"Failed to initialize Google clients in image_analysis: {e}")
    vision_client = None
    gemini_model = None

def reverse_image_search(image_url: str) -> dict:
    """
    Performs an intelligent reverse image search by analyzing the URLs
    of the pages where matching images are found.
    """
    if not vision_client:
        return {"error": "Vision client not initialized."}

    LEGITIMATE_RENTAL_DOMAINS = [
        'airbnb.com', 'booking.com', 'vrbo.com', 'expedia.com',
        'tripadvisor.com', 'homeaway.com', 'idealista.com', 'fotocasa.es'
    ]

    try:
        image = vision.Image()
        image.source.image_uri = image_url
        response = vision_client.web_detection(image=image)
        detection = response.web_detection

        suspicious_urls = []
        syndicated_urls = []

        for page in detection.pages_with_matching_images:
            if any(domain in page.url for domain in LEGITIMATE_RENTAL_DOMAINS):
                syndicated_urls.append(page.url)
            else:
                suspicious_urls.append(page.url)

        if suspicious_urls:
            return {
                "is_reused": True,
                "reason": f"Image found on {len(suspicious_urls)} suspicious or unrelated page(s).",
                "severity": "High",
                "url": image_url,
                "suspicious_urls": suspicious_urls
            }
        
        return {
            "is_reused": False,
            "reason": "Image appears unique or only syndicated on known rental sites.",
            "severity": "Low",
            "url": image_url
        }
    except Exception as e:
        logger.error(f"Cloud Vision API call failed for url {image_url}: {e}")
        return {"is_reused": False, "reason": "Error during reverse image search."}

def check_for_ai_artifacts(image_url: str) -> dict:
    """
    Uses Gemini multimodal capabilities to check for signs of AI generation.
    """
    if not gemini_model:
        return {"error": "Gemini client not initialized."}
    
    try:
        image_response = requests.get(image_url, stream=True)
        image_response.raise_for_status()
        image_data = {
            'mime_type': image_response.headers['content-type'],
            'data': image_response.content
        }

        # Use the helper to load the prompt from a file
        prompt = load_prompt("ai_image_detection_prompt")
        
        response = gemini_model.generate_content([prompt, image_data])
        
        cleaned_text = response.text.strip().replace('```json', '').replace('```', '')
        result = json.loads(cleaned_text)
        result['url'] = image_url
        return result

    except Exception as e:
        logger.error(f"Gemini image analysis failed for url {image_url}: {e}")
        return {
            "confidence_score": 0.0,
            "verdict": "Error",
            "artifacts": [f"Error during analysis: {e}"],
            "url": image_url
        }