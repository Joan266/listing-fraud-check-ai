import uuid
import json
from app.db.session import SessionLocal
from app.db.models import FraudCheck, JobStatus
from .queues import redis_conn
from app.services import gemini_analysis

def _calculate_risk_score(all_results: dict) -> int:
    """
    Calculates a preliminary risk score based on a detailed, weighted analysis
    of all collected job results.
    """
    score = 100
    
    # Define weights for different red flags. These can be tuned over time.
    WEIGHTS = {
        'risky_communication': 50,
        'image_is_reused': 35,
        'ai_image_detected': 25,
        'domain_is_new': 25,
        'data_inconsistency': 20,
        'negative_reputation': 20,
        'description_plagiarism': 15,
        'suspiciously_low_price': 15,
        'unverified_host': 10,
        'high_price': 5,
        'vague_description': 5
    }

    def get_nested(data, keys, default=None):
        for key in keys:
            if isinstance(data, dict):
                data = data.get(key)
            else:
                return default
        return data if data is not None else default

    # --- Apply Deductions Based on Job Results ---

    # Text Analysis
    text_results = get_nested(all_results, ['text_analysis', 'communication_analysis', 'themes']) or []
    if any("Risky Payment Request" in theme for theme in text_results):
        score -= WEIGHTS['risky_communication']
    if any("Vague Details" in theme for theme in get_nested(all_results, ['text_analysis', 'description_analysis', 'themes']) or []):
        score -= WEIGHTS['vague_description']
        
    # Image Analysis
    reuse_results = get_nested(all_results, ['reverse_image_search', 'reverse_search_results']) or []
    if any(res.get('is_reused') for res in reuse_results):
        score -= WEIGHTS['image_is_reused']

    ai_results = get_nested(all_results, ['ai_image_detection', 'ai_detection_results']) or []
    if any(res.get('verdict') == 'Likely AI' for res in ai_results):
        score -= WEIGHTS['ai_image_detected']

    # URL Forensics
    if get_nested(all_results, ['url_forensics', 'domain_age', 'is_new']):
        score -= WEIGHTS['domain_is_new']

    # Consistency & Price/Host Checks
    if get_nested(all_results, ['google_places_analysis', 'inconsistencies']):
        score -= WEIGHTS['data_inconsistency']
    if get_nested(all_results, ['price_and_host_check', 'price_analysis', 'verdict']) == 'Suspiciously Low':
        score -= WEIGHTS['suspiciously_low_price']
    if get_nested(all_results, ['price_and_host_check', 'price_analysis', 'verdict']) == 'High':
        score -= WEIGHTS['high_price']
    if any("Unverified Profile" in theme for theme in get_nested(all_results, ['price_and_host_check', 'host_analysis', 'themes']) or []):
        score -= WEIGHTS['unverified_host']
        
    # Reputation & Plagiarism
    if "scam" in get_nested(all_results, ['reputation_check', 'search_results_text'], '').lower():
        score -= WEIGHTS['negative_reputation']
    if get_nested(all_results, ['description_plagiarism', 'plagiarized']):
        score -= WEIGHTS['description_plagiarism']
        
    return max(0, score)
def job_aggregate_and_conclude(check_id_arg):
    """
    Collects all analysis results, calls the final Gemini model for a full
    synthesis, and saves the complete report to the database.
    """
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg

    print(f"Finalizing report for Check ID: {check_id}")
    
    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check:
            print(f"Error: FraudCheck ID {check_id} not found.")
            return

        redis_main_key = f"cache:{str(check_id)}"
        cached_results = redis_conn.hgetall(redis_main_key)
        if not cached_results:
            check.status = JobStatus.FAILED
            check.final_report = {"error": "No analysis results found in cache."}
            db.commit()
            return

        all_job_results = {key.decode('utf-8'): json.loads(value) for key, value in cached_results.items()}
        
        full_context = {
            "user_provided_data": check.input_data,
            "analysis_results": all_job_results
        }

        # --- Moved all logic inside the try block ---
        initial_score = _calculate_risk_score(all_job_results)
        print(f"Initial rule-based score: {initial_score}")
        if initial_score > 70:
            final_report = gemini_analysis.synthesize_simple_report(full_context)
        else:
            final_report = gemini_analysis.synthesize_advanced_report(full_context)
        
        if "error" in final_report:
            check.status = JobStatus.FAILED
            print(f"❌ Final synthesis failed. Reason: {final_report.get('error')}")
        else:
            check.status = JobStatus.COMPLETED
            print(f"✅ Completed fraud check. Verdict: {final_report.get('final_verdict')}")
            
        check.final_report = final_report
        db.commit()

        return final_report

    except Exception as e:
        # This will now catch any unexpected error during the entire process
        if 'check' in locals() and check:
            check.status = JobStatus.FAILED
            check.final_report = {"error": f"An unexpected error occurred: {str(e)}"}
            db.commit()
        print(f"❌ An unexpected critical error occurred in the finalizer for job_id: {check_id}")
        raise e
    finally:
        db.close()