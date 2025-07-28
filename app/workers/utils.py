import uuid
from app.db.session import SessionLocal
from app.db.models import FraudCheck, JobStatus

def handle_job_failure(job, connection, type, value, traceback):
    """
    A custom failure handler for all RQ jobs.
    It finds the corresponding FraudCheck record and updates its status to FAILED.
    """
    print(f"Job {job.id} failed. Handling failure.")
    
    # The first argument to our jobs is always the check_id
    check_id_arg = job.args[0]
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg

    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if check:
            check.status = JobStatus.FAILED
            # Save the error message for debugging
            check.final_report = {"error": str(value)}
            db.commit()
            print(f"Updated FraudCheck {check_id} status to FAILED.")
    finally:
        db.close()