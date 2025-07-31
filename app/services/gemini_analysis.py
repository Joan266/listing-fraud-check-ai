import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from app.core.config import settings
from app.utils.helpers import load_prompt
import logging
import json
import re

logger = logging.getLogger(__name__)

# --- Initialize TWO models ---
try:
    genai.configure(api_key=settings.GOOGLE_GEMINI_API_KEY)
    # The fast, cheap model for individual analysis tasks
    fast_model = genai.GenerativeModel('gemini-1.5-flash-latest')
    # The powerful, advanced model for the final synthesis
    advanced_model = genai.GenerativeModel('gemini-1.5-pro-latest')
except Exception as e:
    logger.error(f"Failed to initialize Gemini clients: {e}")
    fast_model = None
    advanced_model = None
def _call_gemini(model, content: list, is_json_response: bool = True):
    """A flexible helper to call a Gemini model with various content types."""
    if not model:
        return {"error": "Gemini client not initialized."}

    generation_config = genai.types.GenerationConfig(temperature=0)
    safety_settings = {
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    }

    try:
        response = model.generate_content(
            content,
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        if not is_json_response:
            return response.text

        # Use robust regex to find and parse JSON
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response.text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
        return json.loads(response.text.strip())

    except Exception as e:
        return {"error": f"Gemini API call failed: {e}"}
    
# --- Functions for individual jobs (use the FAST model) ---

def analyze_description(description: str) -> dict:
    prompt = load_prompt("analyze_description_prompt")
    return _call_gemini(fast_model, [prompt, description])

def analyze_communication(text: str) -> dict:
    prompt = load_prompt("analyze_communication_prompt")
    return _call_gemini(fast_model, [prompt, text])

def analyze_listing_reviews(reviews: list) -> dict:
    prompt = load_prompt("analyze_reviews_prompt")
    review_text = "\n".join([f"- {r.get('text')}" for r in reviews])
    return _call_gemini(fast_model, [prompt, review_text])

def check_price_sanity(price_details: str, property_type: str,description:str, address: str) -> dict:
    prompt = load_prompt("check_price_sanity_prompt")
    context = f"Address: {address}\nType: {property_type}\nPrice: {price_details}\nListing Description: {description}"
    print(f"Checking price sanity with context: {context}")  
    return _call_gemini(fast_model, [prompt, context])

def analyze_host_profile(host_data: dict) -> dict:
    prompt = load_prompt("analyze_host_profile_prompt")
    return _call_gemini(fast_model, [prompt, json.dumps(host_data)])

def check_data_consistency(listing_data: dict, google_data: dict) -> dict:
    prompt = load_prompt("check_data_consistency_prompt")
    context = f"Listing Data:\n{json.dumps(listing_data)}\n\nGoogle Maps Data:\n{json.dumps(google_data)}"
    return _call_gemini(fast_model, [prompt, context])

# --- Functions for the finalizer (simple vs. advanced) ---

def synthesize_simple_report(full_context: dict) -> dict:
    """Calls the FAST model for a straightforward final report."""
    prompt = load_prompt("synthesize_final_report_prompt")
    prompt = prompt.replace("[LANGUAGE_CODE]", "en") 
    context_str = json.dumps(full_context, indent=2)
    return _call_gemini(fast_model, [prompt, context_str])

def synthesize_advanced_report(full_context: dict) -> dict:
    """Calls the ADVANCED model for a complex final report."""
    prompt = load_prompt("synthesize_final_report_prompt")
    prompt = prompt.replace("[LANGUAGE_CODE]", "en") 
    context_str = json.dumps(full_context, indent=2)
    print(f"Checking price sanity with context: {context_str}")  
    return _call_gemini(advanced_model, [prompt, context_str])
def extract_data_from_text(raw_text: str) -> dict:
    """Extracts structured data from a raw text paste of a listing."""
    prompt = load_prompt("data_extraction_prompt")
    context = f"\n{raw_text[:10000]}"
    
    return _call_gemini(advanced_model, [prompt, context])

def process_q_and_a(full_context: dict) -> dict:
    """
    Handles post-analysis Q&A using the advanced model for better reasoning.
    """
    prompt = load_prompt("post_analysis_chat_prompt")
    context_str = json.dumps(full_context, indent=2)
    return _call_gemini(advanced_model, [prompt, context_str])
def filter_suspicious_urls(url_data: list) -> dict:
    """
    Uses Gemini to analyze a list of URLs and page titles to determine
    which are suspicious.
    """
    prompt = load_prompt("filter_urls_prompt")
    # Format the data for the prompt
    context = "\n".join([f"- URL: {item['url']}, Title: {item['title']}" for item in url_data])
    
    # Use the fast_model for this quick classification task
    return _call_gemini(fast_model, [prompt, context])
def synthesize_online_presence(context: dict) -> dict:
    """Uses the advanced model to synthesize online presence data."""
    prompt = load_prompt("online_presence_prompt")
    context_str = json.dumps(context, indent=2)
    return _call_gemini(advanced_model, [prompt, context_str])

def analyze_image_for_ai(image_data: dict) -> dict:
    """Analyzes an image for AI artifacts."""
    prompt = load_prompt("ai_image_detection_prompt")
    
    return _call_gemini(advanced_model, [prompt, image_data])