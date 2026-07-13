from google import genai
from google.genai import types
from app.core.config import settings
from app.utils.helpers import load_prompt
import logging
import json
import re

logger = logging.getLogger(__name__)

# --- Model names ---
# FAST calls disable thinking (thinking_budget=0) to avoid latency overhead.
# ADVANCED is used only for synthesis (thinking enabled).
FAST_MODEL = 'gemini-3.5-flash'
ADVANCED_MODEL = 'gemini-3.1-pro-preview'

# --- Initialize client ---
try:
    client = genai.Client(api_key=settings.GOOGLE_GEMINI_API_KEY)
except Exception as e:
    logger.error(f"Failed to initialize Gemini client: {e}")
    client = None

def _call_gemini(model_name: str, content: list, is_json_response: bool = True, thinking: bool = False):
    """A flexible helper to call a Gemini model with various content types."""
    if not client:
        return {"error": "Gemini client not initialized."}

    config = types.GenerateContentConfig(
        temperature=0,
        thinking_config=types.ThinkingConfig(thinking_budget=1024 if thinking else 0),
        safety_settings=[
            types.SafetySetting(category='HARM_CATEGORY_HARASSMENT', threshold='BLOCK_ONLY_HIGH'),
            types.SafetySetting(category='HARM_CATEGORY_HATE_SPEECH', threshold='BLOCK_ONLY_HIGH'),
            types.SafetySetting(category='HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold='BLOCK_ONLY_HIGH'),
            types.SafetySetting(category='HARM_CATEGORY_DANGEROUS_CONTENT', threshold='BLOCK_ONLY_HIGH'),
        ],
    )

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=content,
            config=config,
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

def _wrap_user_data(text: str) -> str:
    """Wraps user-provided text with closing delimiter for anti-injection."""
    return f"{text}\n</user_data>"

def analyze_description(description: str) -> dict:
    prompt = load_prompt("analyze_description_prompt")
    return _call_gemini(FAST_MODEL, [prompt, _wrap_user_data(description)])

def analyze_communication(text: str) -> dict:
    prompt = load_prompt("analyze_communication_prompt")
    return _call_gemini(FAST_MODEL, [prompt, _wrap_user_data(text)])

def analyze_listing_reviews(reviews: list) -> dict:
    prompt = load_prompt("analyze_reviews_prompt")

    review_text = "\n---\n".join([
        f"Reviewer: {r.get('reviewer_name')}\nDate: {r.get('review_date')}\nText: {r.get('review_text')}"
        for r in reviews
    ])

    return _call_gemini(FAST_MODEL, [prompt, _wrap_user_data(review_text)])

def check_price_sanity(price_details: str, property_type: str, description: str, address: str) -> dict:
    prompt = load_prompt("check_price_sanity_prompt")
    context = f"Address: {address}\nType: {property_type}\nPrice: {price_details}\nListing Description: {description}"
    return _call_gemini(FAST_MODEL, [prompt, _wrap_user_data(context)])

def analyze_host_profile(host_data: dict) -> dict:
    prompt = load_prompt("analyze_host_profile_prompt")
    return _call_gemini(FAST_MODEL, [prompt, json.dumps(host_data)])

def check_data_consistency(listing_data: dict, google_data: dict) -> dict:
    prompt = load_prompt("check_data_consistency_prompt")
    context = f"Listing Data:\n{json.dumps(listing_data)}\n\nGoogle Maps Data:\n{json.dumps(google_data)}"
    return _call_gemini(FAST_MODEL, [prompt, context])

# --- Functions for the finalizer (simple vs. advanced) ---

def synthesize_simple_report(full_context: dict) -> dict:
    """Calls the FAST model for a straightforward final report."""
    prompt = load_prompt("synthesize_final_report_prompt")
    prompt = prompt.replace("[LANGUAGE_CODE]", "es")
    context_str = json.dumps(full_context, indent=2)
    return _call_gemini(FAST_MODEL, [prompt, context_str])

def synthesize_advanced_report(full_context: dict) -> dict:
    """Calls the ADVANCED model for a complex final report."""
    prompt = load_prompt("synthesize_final_report_prompt")
    prompt = prompt.replace("[LANGUAGE_CODE]", "es")
    context_str = json.dumps(full_context, indent=2)
    return _call_gemini(ADVANCED_MODEL, [prompt, context_str], thinking=True)
def extract_data_from_text(raw_text: str) -> dict:
    """Extracts structured data from a raw text paste of a listing."""
    prompt = load_prompt("data_extraction_prompt")
    context = f"\n<user_data>\n{raw_text}\n</user_data>"

    return _call_gemini(FAST_MODEL, [prompt, context])

def process_q_and_a(full_context: dict) -> dict:
    """
    Handles post-analysis Q&A using the advanced model for better reasoning.
    """
    prompt = load_prompt("post_analysis_chat_prompt")
    context_str = json.dumps(full_context, indent=2)
    return _call_gemini(ADVANCED_MODEL, [prompt, context_str])
def filter_suspicious_urls(url_data: list) -> dict:
    """
    Uses Gemini to analyze a list of URLs and page titles to determine
    which are suspicious.
    """
    prompt = load_prompt("filter_urls_prompt")
    # Format the data for the prompt
    context = "\n".join([f"- URL: {item['url']}, Title: {item['title']}" for item in url_data])
    
    # Use the fast_model for this quick classification task
    return _call_gemini(FAST_MODEL, [prompt, context])
def synthesize_online_presence(context: dict) -> dict:
    """Uses the advanced model to synthesize online presence data."""
    prompt = load_prompt("online_presence_prompt")
    context_str = json.dumps(context, indent=2)
    return _call_gemini(ADVANCED_MODEL, [prompt, context_str])

def analyze_image_for_ai(image_data: dict) -> dict:
    """Analyzes an image for AI artifacts."""
    prompt = load_prompt("ai_image_detection_prompt")
    image_part = types.Part.from_bytes(
        data=image_data["data"],
        mime_type=image_data["mime_type"],
    )
    return _call_gemini(ADVANCED_MODEL, [prompt, image_part])