import uuid
import json
import logging
import rq
from app.db.session import SessionLocal
from app.db.models import FraudCheck, JobStatus
from app.services import gemini_analysis

logger = logging.getLogger(__name__)

def job_aggregate_and_conclude(check_id_arg):
    """
    Collects the full AnalysisStep results from all dependencies, calls the
    final AI model for synthesis, and saves the complete report.
    """
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg

    logger.info(f"Finalizing report for Check ID: {check_id}")
    
    db = SessionLocal()
    try:
        current_job = rq.get_current_job()
        dependencies = current_job.fetch_dependencies()
        
        all_job_steps = [dep.result for dep in dependencies]
        
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check:
            raise Exception(f"FraudCheck ID {check_id} not found in finalizer.")

        full_context = {
            "user_provided_data": check.input_data,
            "analysis_steps": all_job_steps
        }

        synthesis_report = gemini_analysis.synthesize_advanced_report(full_context)
        
        check.analysis_steps = all_job_steps
        check.final_report = synthesis_report
        check.status = JobStatus.COMPLETED if "error" not in synthesis_report else JobStatus.FAILED
        db.commit()

        logger.info(f"✅ Completed fraud check for job_id: {check_id}.")
        return synthesis_report

    except Exception as e:
        logger.error(f"An unexpected critical error occurred in the finalizer for job_id: {check_id}", exc_info=True)
        check_to_fail = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if check_to_fail:
            check_to_fail.status = JobStatus.FAILED
            check_to_fail.final_report = {"error": f"Finalizer failed: {str(e)}"}
            db.commit()
        raise e
    finally:
        db.close()