import google.generativeai as genai
import json
import logging
import requests
import io
from PIL import Image
from app.core.config import settings
from app.utils.helpers import load_prompt
from google.cloud import vision

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
        'airbnb.com', 'airbnb.es', 'airbnb.co.uk', 'airbnb.fr', 'airbnb.it', 'airbnb.de',
        'booking.com', 'vrbo.com', 'expedia.com', 'tripadvisor.com', 
        'homeaway.com', 'agoda.com', 'idealista.com', 'fotocasa.es',
        'muscache.com'
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
        
        for entity in detection.web_entities:
            if "stock photo" in entity.description.lower() or "getty images" in entity.description.lower():
                return {
                    "is_reused": True,
                    "reason": f"Image is associated with the term '{entity.description}'.",
                    "severity": "High",
                    "url": image_url,
                }

        return {
            "is_reused": False, 
            "reason": "Image appears unique or only syndicated on known rental sites.",
            "severity": "Low",
            "url": image_url,
            "syndicated_urls": syndicated_urls
        }

    except Exception as e:
        logger.error(f"Cloud Vision API call failed for url {image_url}: {e}")
        return {"is_reused": False, "reason": "Error during reverse image search.", "url": image_url}

def check_for_ai_artifacts(image_url: str) -> dict:
    """
    Downloads, resizes, and then analyzes an image for AI artifacts to control costs.
    """
    if not gemini_model:
        return {"error": "Gemini client not initialized."}
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.google.com/'
        }
        image_response = requests.get(image_url, stream=True, headers=headers)
        image_response.raise_for_status()

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

        prompt = load_prompt("ai_image_detection_prompt")
        
        # FIX: Reuse the 'gemini_model' client initialized at the top of the file.
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
            "artifacts": [f"Error during analysis: {str(e)}"],
            "url": image_url
        }