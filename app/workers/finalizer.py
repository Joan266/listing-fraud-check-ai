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
    Collects a list of all AnalysisStep results, calls the final Gemini model
    for synthesis, and saves both the steps and the final report to the database.
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

        # This creates a list of all the AnalysisStep objects from the cache
        all_job_steps = [json.loads(value) for value in cached_results.values()]
        
        full_context = {
            "user_provided_data": check.input_data,
            "analysis_steps": all_job_steps
        }

        # Call the advanced model for the final synthesis
        synthesis_report = gemini_analysis.synthesize_advanced_report(full_context)
        
        if "error" in synthesis_report:
            check.status = JobStatus.FAILED
            check.final_report = synthesis_report # Save the error report
            logger.error(f"Final synthesis failed for job_id: {check_id}.")
        else:
            check.status = JobStatus.COMPLETED
            # Save the raw steps and the final synthesized report to their own columns
            check.analysis_steps = all_job_steps
            check.final_report = synthesis_report
            logger.info(f"✅ Completed fraud check for job_id: {check_id}.")
            
        db.commit()

        # The job's return value is the final synthesized report
        return synthesis_report

    except Exception as e:
        logger.error(f"An unexpected critical error occurred in the finalizer for job_id: {check_id}", exc_info=True)
        if 'check' in locals() and check:
            check.status = JobStatus.FAILED
            check.final_report = {"error": f"An unexpected error occurred: {str(e)}"}
            db.commit()
        raise e
    finally:
        db.close()