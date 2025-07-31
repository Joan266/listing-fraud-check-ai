import uuid
from .queues import analysis_fast_queue, analysis_heavy_queue
from app.workers import tasks, finalizer
from app.workers.utils import handle_job_failure
from app.db.session import SessionLocal
from app.db.models import FraudCheck, JobStatus

def start_full_analysis(check_id_arg):
    """
    This smart orchestrator inspects the input data and only fans out the
    necessary analysis jobs.
    """
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg
        
    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check:
            print(f"Error: FraudCheck ID {check_id} not found.")
            return

        check.status = JobStatus.IN_PROGRESS
        db.commit()
        
        input_data = check.input_data
    finally:
        db.close()

    check_id_str = str(check_id)
    all_analysis_jobs = []
    
    # --- Conditionally Enqueue Jobs Based on Available Data ---

    if input_data.get("address"):
        geocode_job = analysis_fast_queue.enqueue(tasks.job_geocode_places, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
        all_analysis_jobs.append(geocode_job)
        if input_data.get("host_email") or input_data.get("host_phone"):
            reputation_job = analysis_fast_queue.enqueue(tasks.job_reputation_check, check_id_str, depends_on=geocode_job, on_failure=handle_job_failure, result_ttl=3600)
            all_analysis_jobs.append(reputation_job)
        
    if input_data.get("price_details") or input_data.get("host_profile"):
        price_host_job = analysis_fast_queue.enqueue(tasks.job_price_and_host_check, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
        all_analysis_jobs.append(price_host_job)
    if input_data.get("listing_url"):
        url_forensics_job = analysis_fast_queue.enqueue(tasks.job_url_forensics, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
        all_analysis_jobs.append(url_forensics_job)

    if input_data.get("image_urls"):
        reverse_search_job = analysis_heavy_queue.enqueue(tasks.job_reverse_image_search, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
        all_analysis_jobs.append(reverse_search_job)

        ai_detection_job = analysis_heavy_queue.enqueue(tasks.job_ai_image_detection, check_id_str, depends_on=reverse_search_job, on_failure=handle_job_failure, result_ttl=3600)
        all_analysis_jobs.append(ai_detection_job)

    if input_data.get("description"):
        plagiarism_job = analysis_fast_queue.enqueue(tasks.job_description_plagiarism_check, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
        all_analysis_jobs.append(plagiarism_job)

    if input_data.get("description") or input_data.get("communication_text"):
        text_job = analysis_fast_queue.enqueue(tasks.job_text_analysis, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
        all_analysis_jobs.append(text_job)

    if input_data.get("reviews"):
        reviews_job = analysis_fast_queue.enqueue(tasks.job_listing_reviews_analysis, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
        all_analysis_jobs.append(reviews_job)

    
    
    # --- Handle Empty Input & Enqueue Finalizer ---
    
    if not all_analysis_jobs:
        # If no data was provided, no jobs were enqueued.
        # We can end the process here and mark it as failed.
        print(f"No data to analyze for {check_id}. Marking as failed.")
        db = SessionLocal()
        try:
            check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
            if check:
                check.status = JobStatus.FAILED
                check.final_report = {"error": "Insufficient data provided to perform an analysis."}
                db.commit()
        finally:
            db.close()
        return # End the orchestration
    
    # If jobs were enqueued, set up the finalizer to run after they all complete.
    analysis_fast_queue.enqueue(
        finalizer.job_aggregate_and_conclude,
        check_id_str,
        depends_on=all_analysis_jobs,
        on_failure=handle_job_failure
    )
    
    print(f"Enqueued {len(all_analysis_jobs)} analysis jobs for FraudCheck ID: {check_id}.")