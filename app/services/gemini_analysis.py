# app/services/gemini_analysis.py
import google.generativeai as genai
from app.core.config import settings
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    genai.configure(api_key=settings.GOOGLE_GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash-latest')
except Exception as e:
    logger.error(f"Failed to initialize Gemini client: {e}")
    model = None

def analyze_reviews_with_gemini(reviews: list) -> dict:
    """
    Analyzes review text using Gemini to find negative themes.
    """
    if not model:
        return {"summary": "Gemini client not initialized.", "themes": []}
    if not reviews:
        return {"summary": "No reviews provided for analysis.", "themes": []}

    # Prepare the review texts for the prompt
    review_texts = [f"Rating: {r.get('rating')}/5, Text: {r.get('text')}" for r in reviews[:5]] # Analyze top 5 reviews
    formatted_reviews = "\n---\n".join(review_texts)

    prompt = f"""
    You are a fraud detection analyst. Based ONLY on the following user reviews for a rental property, provide a one-sentence summary of the overall sentiment and list up to 3 major negative themes as bullet points. If you detect words like 'scam', 'fraud', or 'fake', make that the first theme.

    Reviews:
    {formatted_reviews}
    """

    try:
        response = model.generate_content(prompt)
        # We will create a simplified analysis based on the text response
        text_response = response.text.lower()
        analysis = {"summary": response.text.split('\n')[0], "themes": []}
        
        # Simple theme extraction
        if "scam" in text_response or "fraud" in text_response:
             analysis["themes"].append("Direct accusations of scam or fraud found in reviews.")
        if "reception" in text_response or "check-in" in text_response or "rude" in text_response:
            analysis["themes"].append("Severe issues reported with check-in process and customer service.")
        if "dirty" in text_response or "broken" in text_response or "smell" in text_response:
            analysis["themes"].append("Complaints about property cleanliness and broken facilities.")
        if "misleading" in text_response or "not a hotel" in text_response:
            analysis["themes"].append("Listing is described as potentially misleading.")

        return analysis

    except Exception as e:
        logger.error(f"Gemini API call failed: {e}")
        return {"summary": "Error analyzing reviews with Gemini.", "themes": []}

def analyze_search_results_with_gemini(snippets: str) -> dict:
    """
    Analyzes web search snippets with Gemini to find credible scam reports.
    """
    if not model:
        return {"issue_found": False, "summary": "Gemini client not initialized."}
    if not snippets.strip():
        return {"issue_found": False, "summary": "No search results to analyze."}

    prompt = f"""
    You are a fraud detection analyst. Based ONLY on the following text snippets from a web search, determine if there are any credible mentions of a 'scam', 'fraud', 'complaint', or similar serious issue.

    If you find a credible issue, summarize it in one sentence. If you find nothing credible, respond with ONLY the text "No credible issues found.".

    Search Snippets:
    {snippets}
    """

    try:
        response = model.generate_content(prompt)
        summary = response.text.strip()
        
        if "no credible issues found" in summary.lower():
            return {"issue_found": False, "summary": "No credible issues found in web search."}
        else:
            return {"issue_found": True, "summary": summary}

    except Exception as e:
        logger.error(f"Gemini search analysis failed: {e}")
        return {"issue_found": False, "summary": "Error analyzing search results."}

def analyze_description_text(description: str) -> dict:
    """
    Analyzes a listing's description for scam tactics using Gemini.
    """
    if not model or not description:
        return {"summary": "No description provided or Gemini not initialized.", "themes": []}

    prompt = f"""
    You are a fraud detection analyst. Analyze the following rental listing description for common scam tactics. Look specifically for:
    1.  Urgency Pressure: Phrases that pressure the user to act quickly.
    2.  Grammar/Spelling: Unprofessional or numerous errors.
    3.  Vague Language: Lack of specific details about the property.
    4.  Too-Good-To-Be-True: Promises that seem unrealistic.

    Based on your analysis, provide a one-sentence summary and list any negative themes found.

    Description:
    "{description}"
    """
    try:
            response = model.generate_content(prompt)
            text_response = response.text.lower()
            analysis = {"summary": response.text.split('\n')[0], "themes": []}

            if "urgency" in text_response or "pressure" in text_response:
                analysis["themes"].append("The description uses high-pressure tactics to rush the decision.")
            if "grammar" in text_response or "spelling" in text_response or "errors" in text_response:
                analysis["themes"].append("The text contains unprofessional grammar or spelling errors.")
            
            return analysis

    except Exception as e:
        logger.error(f"Gemini description analysis failed: {e}")
        return {"summary": "Error analyzing description.", "themes": []}

# In app/services/gemini_analysis.py

def synthesize_final_report(synthesis_data: dict) -> str:
    """
    Performs a final cross-analysis to generate an intelligent executive summary.
    """
    if not model:
        return "Analysis complete. Could not perform final synthesis."

    place_data = synthesis_data.get("place_data", {})
    
    # NEW: Create a comparative summary
    findings_summary = f"""
    - Listing vs. Google Place Type: "{synthesis_data.get('property_type', 'N/A')}" vs. "{', '.join(place_data.get('types', []))}"
    - Listing vs. Google Place Rating: "{synthesis_data.get('listing_rating', 'N/A')}" vs. "{place_data.get('rating', 'N/A')}/5"
    - Red Flags: {len(synthesis_data.get("red_flags", []))}
    - Positive Signals: {len(synthesis_data.get("positive_signals", []))}
    - Key Red Flags: {[flag['message'] for flag in synthesis_data.get('red_flags', [])]}
    - Key Positive Signals: {[signal['message'] for signal in synthesis_data.get('positive_signals', [])]}
    """

    prompt = f"""
    You are a senior fraud analyst writing a final, one-sentence executive summary.
    Your most important task is to identify the single most critical finding (positive or negative) from the data provided.
    
    Prioritize in this order:
    1. A major contradiction between the Listing data and the Google Place data.
    2. A severe red flag (e.g., scam reports, phishing, major inconsistency).
    3. A major positive signal (e.g., a highly-rated, perfectly matching business).

    Based on the following comparative data, write the executive summary.

    Data:
    {findings_summary}

    Final Executive Summary:
    """

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini final synthesis failed: {e}")
        return f"Analysis complete. Found {len(synthesis_data.get('red_flags', []))} potential red flags."
def analyze_communication(text: str) -> dict:
    """
    Analyzes communication text for multiple fraudulent themes.
    """
    if not model or not text:
        return {"themes": []}

    prompt = f"""
    You are a fraud detection analyst. Analyze the following conversation.
    Respond ONLY with a valid JSON object with boolean keys for each of the following fraudulent themes:
    - "risky_payment_request": True if there is any request to pay outside a secure platform.
    - "high_pressure_tactics": True if the language creates false urgency.
    - "refusal_to_view": True if the host refuses or makes excuses for an in-person viewing.
    - "evasive_answers": True if the host avoids answering direct questions about the property.
    - "phishing_attempt": True if the host requests excessive or unusual personal/financial data.

    Conversation:
    "{text}"
    """
    try:
        response = model.generate_content(prompt)
        cleaned_text = response.text.strip().replace('```json', '').replace('```', '')
        analysis = json.loads(cleaned_text)

        themes = []
        if analysis.get("risky_payment_request"):
            themes.append("Host is requesting a risky, off-platform payment method.")
        if analysis.get("high_pressure_tactics"):
            themes.append("Host is using high-pressure tactics.")
        if analysis.get("refusal_to_view"):
            themes.append("Host is refusing or making excuses for an in-person viewing.")
        if analysis.get("evasive_answers"):
            themes.append("Host is providing vague or evasive answers to specific questions.")
        if analysis.get("phishing_attempt"):
            themes.append("Host is attempting to phish for sensitive personal information.")

        return {"themes": themes}
    except Exception as e:
        logger.error(f"Gemini communication analysis failed: {e}")
        return {"themes": []}
    
def extract_data_from_paste(raw_text: str) -> dict:
    """
    Extracts structured data from a raw text paste of a listing page using a one-shot prompt.
    """
    if not model or not raw_text:
        return {}

    prompt = f"""
    You are a data extraction specialist. From the following raw text copied from a rental website,
    extract the fields listed below into a valid JSON object. If a field is not found, use a null value.

    FIELDS TO EXTRACT:
    - address (string)
    - property_type (string)
    - guest_summary (string)
    - host_description (string)
    - listing_rating (float, the overall rating for the listing itself)
    - listing_review_count (integer, the total number of reviews for the listing)
    - extracted_description (string)
    - available_amenities (list of strings)
    - price_details (object with 'price_per_night' or 'price_per_month', 'cleaning_fee', etc.)
    - extracted_reviews (list of objects, each with 'author', 'text', 'rating', etc.)


    EXAMPLE OF DESIRED JSON OUTPUT:
    {{
        "address": "Carrer de la Diputació, 250, 08007 Barcelona, Spain",
        "property_type": "Apartment",
        "guest_summary": "3 guests, 2 bedrooms, 2 beds, 1 bath",
        "host_description": "Caliu Housing, 3 years of experience in the short-term rental market, offers a wide range of apartments in Barcelona.",
        "host_name": "Caliu Housing",
        "listing_rating": 4.7,
        "listing_review_count": 10,
        "extracted_description": "In the heart of the Eixample district...",
        "available_amenities": ["Kitchen", "Wifi"],
        "price_details": {{
            "price_per_month": "€1,829"
        }},
        "extracted_reviews": [
            {{
                "author": "Shang",
                "text": "The stay was very comfortable and very central.",
                "rating": 5
            }}
        ]
    }}

    RAW TEXT TO ANALYZE:
    ---
    {raw_text[:4000]}
    ---

    Respond with ONLY the valid JSON object.
    """
    try:
        response = model.generate_content(prompt)
        cleaned_text = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(cleaned_text)
    except Exception as e:
        logger.error(f"Gemini data extraction failed: {e}")
        return {}
def check_description_consistency(listing_description: str, google_description: str) -> dict:
    """Compares two descriptions to see if they refer to the same property."""
    if not listing_description or not google_description:
        return {"is_consistent": True, "reason": "One or both descriptions are missing."}
    
    prompt = f"""
    As a fraud analyst, compare these two descriptions for the same property address.
    Description 1 is from the rental listing. Description 2 is from the official Google Maps business profile.
    Do they describe the same kind of place? Note any major contradictions (e.g., apartment vs. hotel, different features, wildly different tone).
    Respond ONLY with a JSON object with two keys: "is_consistent" (boolean) and "reason" (a brief string explanation of any discrepancy).

    ---
    Description 1 (from Listing):
    "{listing_description}"
    ---
    Description 2 (from Google Maps):
    "{google_description}"
    ---
    """
    try:
        response = model.generate_content(prompt)
        cleaned_text = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(cleaned_text)
    except Exception as e:
        logger.error(f"Gemini description consistency check failed: {e}")
        return {"is_consistent": True, "reason": "Analysis failed."} # Fail safely

def check_review_consistency(listing_reviews: list, google_reviews: list) -> dict:
    """Compares two sets of reviews for sentiment and theme consistency."""
    if not listing_reviews or not google_reviews:
        return {"is_consistent": True, "reason": "One or both review sets are missing."}

    # Format the reviews for the prompt
    listing_review_texts = "\n- ".join([r.get('text', '') for r in listing_reviews])
    google_review_texts = "\n- ".join([r.get('text', '') for r in google_reviews])

    prompt = f"""
    As a fraud analyst, compare the sentiment and themes of these two sets of reviews for the same location.
    Set 1 is from the rental listing itself. Set 2 is from the public Google Maps profile.
    Is there a significant discrepancy? For example, is Set 1 perfectly glowing while Set 2 contains many complaints (scams, dirtiness, poor service)?
    Respond ONLY with a JSON object with two keys: "is_consistent" (boolean) and "reason" (a brief string explanation, e.g., "Listing reviews are perfect, but Google reviews mention bed bugs and theft.").

    ---
    Set 1 (from Listing):
    - {listing_review_texts}
    ---
    Set 2 (from Google Maps):
    - {google_review_texts}
    ---
    """
    try:
        response = model.generate_content(prompt)
        cleaned_text = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(cleaned_text)
    except Exception as e:
        logger.error(f"Gemini review consistency check failed: {e}")
        return {"is_consistent": True, "reason": "Analysis failed."} 
    
def analyze_host_reputation(snippets: str, host_name: str) -> dict:
    """Analyzes web search snippets for credible negative reputation issues."""
    
    prompt = f"""
    As a fraud analyst, review the following web search snippets about a rental host named "{host_name}".
    Ignore irrelevant results. Focus on finding credible complaints, accusations of scams, or patterns of significant negative reviews.
    Respond ONLY with a JSON object with two keys:
    - "issue_found": boolean (true if you find credible negative information).
    - "summary": A brief one-sentence summary explaining the issue found, or stating that no issues were found.

    ---
    Web Search Snippets:
    "{snippets}"
    ---
    """
    try:
        response = model.generate_content(prompt)
        cleaned_text = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(cleaned_text)
    except Exception as e:
        logger.error(f"Gemini host reputation analysis failed: {e}")
        return {"issue_found": False, "summary": "Analysis of host reputation failed."}
def check_price_sanity(price_details: dict, property_type: str, address: str) -> dict:
    """
    Uses Gemini to perform a market rate comparison for a rental price.
    This function is globally applicable.
    """
    price_string = price_details.get("price_per_month") or price_details.get("price_per_night")
    if not all([price_string, property_type, address]):
        return {"verdict": "unknown", "reason": "Missing data for price analysis."}

    prompt = f"""
    As a real estate market analyst with access to global, real-time market data, evaluate the following rental price.
    Based on the specific location provided in the address, is this price suspiciously low, reasonable, or suspiciously high?
    Respond ONLY with a JSON object with two keys:
    - "verdict": A single string, either "suspiciously_low", "reasonable", or "high".
    - "reason": A brief one-sentence explanation for your verdict.

    ---
    Property Details:
    - Address: "{address}"
    - Property Type: "{property_type}"
    - Price: "{price_string}"
    ---
    """
    try:
        response = model.generate_content(prompt)
        cleaned_text = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(cleaned_text)
    except Exception as e:
        logger.error(f"Gemini price sanity check failed: {e}")
        return {"verdict": "unknown", "reason": "Price analysis failed."}
def analyze_search_results_for_reputation(snippets: str, property_name: str) -> dict:
    """Analyzes web search snippets for credible negative reputation issues about a property."""
    
    prompt = f"""
    As a fraud analyst, review the following web search snippets about a property named "{property_name}".
    Your task is to identify credible reports of scams, fraud, major complaints (e.g., legal action, health code violations), or patterns of severe negative reviews. Ignore isolated bad reviews about minor issues.
    Respond ONLY with a JSON object with two keys:
    - "issue_found": boolean (true if you find credible and significant negative information).
    - "summary": A brief one-sentence summary explaining the issue, or stating no major issues were found.

    ---
    Web Search Snippets:
    "{snippets}"
    ---
    """
    try:
        response = model.generate_content(prompt)
        cleaned_text = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(cleaned_text)
    except Exception as e:
        logger.error(f"Gemini reputation analysis failed: {e}")
        return {"issue_found": False, "summary": "Analysis of external reputation failed."}