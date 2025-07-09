# app/tasks/fraud_checker.py
from app.db.database import SessionLocal
from app.db.models import FraudCheck, JobStatus
from app.services import google_apis
import uuid
import logging

logger = logging.getLogger(__name__)

def run_address_check_task(job_id: str):
    """
    The background task to perform the initial address validation.
    """
    db = SessionLocal()
    try:
        logger.info(f"Starting address check for job_id: {job_id}")
        job_uuid = uuid.UUID(job_id)
        db_job = db.query(FraudCheck).filter(FraudCheck.id == job_uuid).first()

        if not db_job:
            logger.error(f"Job not found in DB: {job_id}")
            return

        db_job.status = JobStatus.IN_PROGRESS
        db.commit()

        address = db_job.input_data.get("address")
        if not address:
            raise ValueError("No address provided in input data.")

        validation_report = google_apis.validate_address_and_get_place_details(address)
        
        db_job.result = validation_report
        db_job.status = JobStatus.COMPLETED
        db.commit()
        logger.info(f"Completed address check for job_id: {job_id}")

    except Exception as e:
        logger.error(f"Task failed for job_id {job_id}: {e}")
        if 'db_job' in locals() and db_job:
            db_job.status = JobStatus.FAILED
            db_job.result = {"error": str(e)}
            db.commit()
    finally:
        db.close()