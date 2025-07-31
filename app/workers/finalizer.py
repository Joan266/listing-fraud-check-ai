import uuid
import json
import logging
from app.db.session import SessionLocal
from app.db.models import FraudCheck, JobStatus
from .queues import redis_conn
from app.services import gemini_analysis

logger = logging.getLogger(__name__)

def job_aggregate_and_conclude(check_id_arg):
    """
    Collects all analysis results, calls the final Gemini model for a full
    synthesis, and saves the complete report to the database.
    """
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg

    logger.info(f"Finalizing report for Check ID: {check_id}")
    
    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check:
            logger.error(f"Error: FraudCheck ID {check_id} not found in finalizer.")
            return

        redis_main_key = f"cache:{str(check_id)}"
        cached_results = redis_conn.hgetall(redis_main_key)
        if not cached_results:
            check.status = JobStatus.FAILED
            check.final_report = {"error": "No analysis results found in cache."}
            db.commit()
            logger.error(f"Error: No cached results found for Check ID: {check_id}")
            return

        all_job_results = {key.decode('utf-8'): json.loads(value) for key, value in cached_results.items()}
        
        full_context = {
            "user_provided_data": check.input_data,
            "analysis_results": all_job_results
        }

        # Always use the advanced model for the final, most important step
        final_report = gemini_analysis.synthesize_advanced_report(full_context)
        
        if "error" in final_report:
            check.status = JobStatus.FAILED
            logger.error(f"Final synthesis failed for job_id: {check_id}. Reason: {final_report.get('error')}")
        else:
            check.status = JobStatus.COMPLETED
            logger.info(f"✅ Completed fraud check for job_id: {check_id}. Verdict: {final_report.get('final_verdict')}")
            
        check.final_report = final_report
        db.commit()

        return final_report

    except Exception as e:
        logger.error(f"An unexpected critical error occurred in the finalizer for job_id: {check_id}", exc_info=True)
        if 'check' in locals() and check:
            check.status = JobStatus.FAILED
            check.final_report = {"error": f"An unexpected error occurred: {str(e)}"}
            db.commit()
        raise e
    finally:
        db.close()