import uuid
from .queues import analysis_fast_queue, analysis_heavy_queue
from app.workers import tasks, finalizer
from app.workers.utils import handle_job_failure
from app.db.session import SessionLocal
from app.db.models import FraudCheck, JobStatus

def start_full_analysis(check_id_arg):
    """
    This orchestrator job fans out all individual tasks for a given fraud check.
    If any job fails, the handle_job_failure function will be called.
    """
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg
        
    print(f"Starting orchestration for FraudCheck ID: {check_id}")
    
    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check:
            print(f"Error: FraudCheck ID {check_id} not found.")
            return

        check.status = JobStatus.IN_PROGRESS
        db.commit()
    finally:
        db.close()

    check_id_str = str(check_id)

    # --- Enqueue analysis jobs with the failure handler ---
    geocode_job = analysis_fast_queue.enqueue(
        tasks.job_geocode_places, check_id_str, on_failure=handle_job_failure
    )
    url_forensics_job = analysis_fast_queue.enqueue(
        tasks.job_url_forensics, check_id_str, on_failure=handle_job_failure
    )
    reputation_job = analysis_fast_queue.enqueue(
        tasks.job_reputation_check, check_id_str, depends_on=geocode_job, on_failure=handle_job_failure
    )
    plagiarism_job = analysis_fast_queue.enqueue(
        tasks.job_description_plagiarism_check, check_id_str, on_failure=handle_job_failure
    )
    reverse_search_job = analysis_heavy_queue.enqueue(
        tasks.job_reverse_image_search, check_id_str, on_failure=handle_job_failure
    )
    ai_detection_job = analysis_heavy_queue.enqueue(
        tasks.job_ai_image_detection, check_id_str, depends_on=reverse_search_job, on_failure=handle_job_failure
    )
    text_job = analysis_fast_queue.enqueue(
        tasks.job_text_analysis, check_id_str, on_failure=handle_job_failure
    )
    reviews_job = analysis_fast_queue.enqueue(
        tasks.job_listing_reviews_analysis, check_id_str, on_failure=handle_job_failure
    )
    price_host_job = analysis_fast_queue.enqueue(
        tasks.job_price_and_host_check, check_id_str, on_failure=handle_job_failure
    )
    google_places_job = analysis_fast_queue.enqueue(
        tasks.job_google_places_analysis, check_id_str, depends_on=geocode_job, on_failure=handle_job_failure
    )
    
    # --- Enqueue the Final Aggregation Job ---
    all_analysis_jobs = [
        reputation_job, plagiarism_job, reverse_search_job, 
        ai_detection_job, text_job, reviews_job, 
        price_host_job, google_places_job, url_forensics_job
    ]
    
    analysis_fast_queue.enqueue(
        finalizer.job_aggregate_and_conclude,
        check_id_str,
        depends_on=all_analysis_jobs,
        on_failure=handle_job_failure
    )
    print(f"All jobs for FraudCheck ID: {check_id} have been enqueued.")