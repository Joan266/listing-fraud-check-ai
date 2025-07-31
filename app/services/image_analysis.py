import google.generativeai as genai
import json
import logging
import requests
import io
from PIL import Image
from app.core.config import settings
from app.services import gemini_analysis
from app.utils.helpers import load_prompt
from google.cloud import vision

logger = logging.getLogger(__name__)

# Initialize clients once for efficiency
try:
    vision_client = vision.ImageAnnotatorClient()
    genai.configure(api_key=settings.GOOGLE_GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-1.5-pro-latest')
except Exception as e:
    logger.error(f"Failed to initialize Google clients in image_analysis: {e}")
    vision_client = None
    gemini_model = None

def reverse_image_search(image_url: str) -> dict:
    """
    Performs an intelligent reverse image search by using an AI to classify
    the pages where matching images are found.
    """
    if not vision_client:
        return {"error": "Vision client not initialized."}

    try:
        image = vision.Image()
        image.source.image_uri = image_url
        response = vision_client.web_detection(image=image)
        detection = response.web_detection

        if not detection.pages_with_matching_images:
            return {
                "is_reused": False,
                "reason": "Image appears to be unique.",
                "url": image_url
            }

        # 1. Gather the context for all matching pages
        url_data_to_filter = [
            {"url": page.url, "title": page.page_title}
            for page in detection.pages_with_matching_images
        ]

        # 2. Call the AI to classify the URLs
        classification_result = gemini_analysis.filter_suspicious_urls(url_data_to_filter)
        
        suspicious_urls = classification_result.get("suspicious_urls", [])

        # 3. Base the verdict on the AI's classification
        if suspicious_urls:
            return {
                "is_reused": True,
                "reason": f"Image found on {len(suspicious_urls)} potentially suspicious or unrelated page(s).",
                "suspicious_urls": suspicious_urls,
                "url": image_url
            }
        
        return {
            "is_reused": False,
            "reason": "Image was found on other sites, but they appear to be legitimate rental or travel platforms.",
            "url": image_url
        }
    except Exception as e:
        logger.error(f"Cloud Vision API call failed for url {image_url}: {e}")
        return {"is_reused": False, "reason": "Error during reverse image search.", "url": image_url}
    
def check_for_ai_artifacts(image_url: str) -> dict:
    """
    Downloads, resizes, and then calls the Gemini service to analyze an image.
    """
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