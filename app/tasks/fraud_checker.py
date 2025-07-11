# app/tasks/fraud_checker.py
from app.db.database import SessionLocal
from app.db.models import FraudCheck, JobStatus
from app.services import google_apis, gemini_analysis, google_search, image_analysis
import uuid
import logging

logger = logging.getLogger(__name__)

# In app/tasks/fraud_checker.py

def run_address_check_task(job_id: str):
    db = SessionLocal()
    try:
        logger.info(f"Starting analysis for job_id: {job_id}")
        job_uuid = uuid.UUID(job_id)
        db_job = db.query(FraudCheck).filter(FraudCheck.id == job_uuid).first()

        if not db_job: return

        db_job.status = JobStatus.IN_PROGRESS
        db.commit()

        input_data = db_job.input_data
        address = input_data.get("address")
        description = input_data.get("description")        
        image_urls = input_data.get("image_urls", [])   
        
        if not address: raise ValueError("No address provided.")

        place_data = google_apis.validate_address_and_get_place_details(address)
        
        red_flags = []
        
        # --- Start of Analysis ---

        # 1. Quantitative Checks
        if place_data.get("validation_result") != "PERFECT_MATCH":
            red_flags.append({"type": "Address Validation", "message": f"Address validation failed: {place_data.get('validation_result')}", "severity": "High"})
        if place_data.get('business_status') and place_data.get('business_status') != 'OPERATIONAL':
            red_flags.append({"type": "Business Status", "message": f"Google lists status as: {place_data.get('business_status')}", "severity": "High"})
        if place_data.get('rating') and place_data.get('rating') < 3.5:
             red_flags.append({"type": "Low Rating", "message": f"Low overall rating of {place_data.get('rating')}/5.", "severity": "Medium"})
        if place_data.get('user_ratings_total') is not None and place_data.get('user_ratings_total') < 10:
             red_flags.append({"type": "Low Review Count", "message": f"Very few reviews ({place_data.get('user_ratings_total')}).", "severity": "Low"})

        # 2. Gemini Review Analysis
        reviews = place_data.get('reviews')
        gemini_review_analysis = None
        if reviews:
            gemini_review_analysis = gemini_analysis.analyze_reviews_with_gemini(reviews)
            for theme in gemini_review_analysis.get("themes", []):
                red_flags.append({
                    "type": "Review Analysis",
                    "message": theme,
                    "severity": "High" if "scam" in theme.lower() else "Medium"
                })
        
        # 3. External Reputation Check
        country_code = None
        for component in place_data.get('address_components', []):
            if 'country' in component.get('types', []):
                country_code = component.get('short_name', '').lower()
                break

        search_keywords = {
            'en': ['scam', 'fraud', 'complaint'],
            'es': ['estafa', 'fraude', 'queja']
        }
        
        property_name = place_data.get('name', address)
        queries = []
        
        for keyword in search_keywords['en']:
            queries.append(f'"{property_name}" {keyword}')

        if country_code and country_code in search_keywords:
            for keyword in search_keywords[country_code]:
                queries.append(f'"{property_name}" {keyword}')
        
        all_snippets = ""
        for query in queries:
            all_snippets += google_search.search_web(query) + " "
           
        print(f"Search snippets collected: {all_snippets}")
        reputation_analysis = gemini_analysis.analyze_search_results_with_gemini(all_snippets)
        print(f"Reputation Analysis: {reputation_analysis}")
        if reputation_analysis.get("issue_found"):
            red_flags.append({
                "type": "External Reputation Check",
                "message": reputation_analysis.get("summary"),
                "severity": "High"
            })
            
             
        if description:
            description_analysis = gemini_analysis.analyze_description_text(description)
            for theme in description_analysis.get("themes", []):
                red_flags.append({"type": "Description Analysis", "message": theme, "severity": "Medium"})

    
        if image_urls:
            for url in image_urls:
                image_result = image_analysis.reverse_image_search(url)
                if image_result.get("is_reused"):
                    red_flags.append({"type": "Image Analysis", "message": image_result.get("summary"), "severity": "High"})
                    break # Stop after finding one reused image
      
        summary = gemini_review_analysis.get("summary") if gemini_review_analysis and gemini_review_analysis.get("summary") else f"Analysis complete. Found {len(red_flags)} potential red flags."
        final_report = {
            "summary": summary,
            "risk_score": "High" if len(red_flags) > 2 else "Medium" if len(red_flags) > 0 else "Low",
            "red_flags": red_flags,
            "raw_google_data": place_data
        }
        
        db_job.result = final_report
        db_job.status = JobStatus.COMPLETED
        db.commit()
        logger.info(f"Completed analysis for job_id: {job_id}")

    except Exception as e:
        logger.error(f"Task failed for job_id {job_id}: {e}")
        if 'db_job' in locals() and db_job:
            db_job.status = JobStatus.FAILED; db_job.result = {"error": str(e)}; db.commit()
    finally:
        db.close()