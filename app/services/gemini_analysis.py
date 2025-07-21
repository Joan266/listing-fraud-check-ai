import google.generativeai as genai
from app.core.config import settings
from app.utils.helpers import load_prompt
import logging
import json

logger = logging.getLogger(__name__)

# Initialize client
try:
    genai.configure(api_key=settings.GOOGLE_GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash-latest')
except Exception as e:
    logger.error(f"Failed to initialize Gemini client: {e}")
    model = None

def _call_gemini_with_json_response(prompt: str, context: str) -> dict:
    """Helper function to call Gemini and parse a JSON response."""
    if not model:
        return {"error": "Gemini client not initialized."}
    try:
        full_prompt = f"{prompt}\n\n---DATA TO ANALYZE---\n{context}"
        response = model.generate_content(full_prompt)
        cleaned_text = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(cleaned_text)
    except Exception as e:
        logger.error(f"Gemini API call failed: {e}")
        return {"error": f"Gemini API Error: {e}"}

# --- Functions for job_text_analysis ---
def analyze_description(description: str) -> dict:
    prompt = load_prompt("analyze_description_prompt")
    return _call_gemini_with_json_response(prompt, description)

def analyze_communication(text: str) -> dict:
    prompt = load_prompt("analyze_communication_prompt")
    return _call_gemini_with_json_response(prompt, text)

# --- Function for job_listing_reviews_analysis ---
def analyze_listing_reviews(reviews: list) -> dict:
    prompt = load_prompt("analyze_reviews_prompt")
    review_text = "\n".join([f"- {r.get('text')}" for r in reviews])
    return _call_gemini_with_json_response(prompt, review_text)

# --- Functions for job_price_and_host_check ---
def check_price_sanity(price_details: dict, property_type: str, address: str) -> dict:
    prompt = load_prompt("check_price_sanity_prompt")
    context = f"Address: {address}\nType: {property_type}\nPrice: {price_details}"
    return _call_gemini_with_json_response(prompt, context)

def analyze_host_profile(host_data: dict) -> dict:
    prompt = load_prompt("analyze_host_profile_prompt")
    return _call_gemini_with_json_response(prompt, json.dumps(host_data))

# --- Function for job_google_places_analysis ---
def check_data_consistency(listing_data: dict, google_data: dict) -> dict:
    prompt = load_prompt("check_data_consistency_prompt")
    context = f"Listing Data:\n{json.dumps(listing_data)}\n\nGoogle Maps Data:\n{json.dumps(google_data)}"
    return _call_gemini_with_json_response(prompt, context)