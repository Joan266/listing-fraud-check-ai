# app/services/image_analysis.py
from google.cloud import vision
import logging

logger = logging.getLogger(__name__)

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
        web_detection = response.web_detection

        # Check if the image appears on many other pages (a sign of a stock photo)
        if web_detection.pages_with_matching_images:
            if len(web_detection.pages_with_matching_images) > 3: # Arbitrary threshold
                return {
                    "is_reused": True,
                    "summary": f"Image found on {len(web_detection.pages_with_matching_images)} other websites, indicating it may be a stock photo or stolen."
                }
        
        return {"is_reused": False, "summary": "Image appears to be unique."}

    except Exception as e:
        logger.error(f"Cloud Vision API call failed: {e}")
        return {"is_reused": False, "summary": "Could not perform image analysis."}