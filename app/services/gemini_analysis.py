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