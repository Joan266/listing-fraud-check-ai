
from google.cloud import vision
import google.generativeai as genai
from app.core.config import settings
import logging
import requests
import json

logger = logging.getLogger(__name__)
try:
    genai.configure(api_key=settings.GOOGLE_GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash-latest')
except Exception as e:
    logger.error(f"Failed to initialize Gemini client in image_analysis: {e}")
    gemini_model = None
def reverse_image_search(image_url: str) -> dict:
    """
    Performs a reverse image search using Google Cloud Vision
    to see if an image is reused elsewhere.
    """
    try:
        client = vision.ImageAnnotatorClient()
        image = vision.Image()
        image.source.image_uri = image_url

        response = client.web_detection(image=image)
        detection = response.web_detection

        # Rule 1: Direct copy found (High Severity)
        # If len is > 1, it means the exact image exists on another page besides the original.
        if len(detection.full_matching_images) > 1:
            return {
                "is_reused": True, 
                "reason": f"A direct copy of the image was found on {len(detection.full_matching_images)} other pages.",
                "severity": "High"
            }

        # Rule 2: It's a common stock photo (High Severity)
        if len(detection.pages_with_matching_images) > 10: # Use a high threshold
            return {
                "is_reused": True,
                "reason": f"Image is very common, found on {len(detection.pages_with_matching_images)} pages. Likely a stock photo.",
                "severity": "High"
            }

        # Rule 3: Check web entities for clues (Medium Severity)
        for entity in detection.web_entities:
            if "stock photo" in entity.description.lower() or "ikea" in entity.description.lower():
                return {
                    "is_reused": True,
                    "reason": f"Image is associated with '{entity.description}', suggesting it's not original.",
                    "severity": "Medium"
                }
                
        return {"is_reused": False, "reason": "Image appears to be unique.", "severity": "Low"}

    except Exception as e:
        logger.error(f"Cloud Vision API call failed: {e}")
        return {"is_reused": False, "summary": "Could not perform image analysis."}
def check_for_ai_artifacts(image_url: str) -> dict:
    """
    Uses Gemini multimodal capabilities to check for signs of AI generation.
    """
    if not gemini_model:
        return {"is_ai": False, "reason": "Gemini client not initialized."}
    
    try:
        # Download image data from URL
        image_response = requests.get(image_url, stream=True)
        image_response.raise_for_status()
        image_data = {
            'mime_type': image_response.headers['content-type'],
            'data': image_response.content
        }

        prompt = """
        Analyze this image from a rental listing. Are there any visual inconsistencies, 
        unnatural textures, strange details in backgrounds, or other artifacts that suggest 
        it might be created by a generative AI? 
        Respond with ONLY a JSON object with two keys: "is_ai_generated" (boolean) and "reason" (a brief string explanation).
        """
        
        response = gemini_model.generate_content([prompt, image_data])
        
        # Clean and parse the JSON response from Gemini
        cleaned_text = response.text.strip().replace('```json', '').replace('```', '')
        result = json.loads(cleaned_text)

        return {
            "is_ai": result.get("is_ai_generated", False),
            "reason": result.get("reason", "")
        }

    except Exception as e:
        logger.error(f"Gemini image analysis failed for url {image_url}: {e}")
        return {"is_ai": False, "reason": "Error during AI image analysis."}
