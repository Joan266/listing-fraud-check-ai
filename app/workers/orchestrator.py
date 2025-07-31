import uuid
from .queues import analysis_fast_queue, analysis_heavy_queue
from app.workers import tasks, finalizer
from app.workers.utils import handle_job_failure
from app.db.session import SessionLocal
from app.db.models import FraudCheck, JobStatus

def start_full_analysis(check_id_arg):
    """
    This orchestrator enqueues all individual and synthesis jobs, managing the
    multi-layered dependency graph.
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
    finally:
        db.close()

    check_id_str = str(check_id)

    # --- Layer 1: Enqueue initial, independent data-gathering jobs ---
    # These can all start immediately.
    geocode_job = analysis_fast_queue.enqueue(tasks.job_geocode, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
    url_forensics_job = analysis_fast_queue.enqueue(tasks.job_url_forensics, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
    plagiarism_job = analysis_fast_queue.enqueue(tasks.job_description_plagiarism_check, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
    description_analysis_job = analysis_fast_queue.enqueue(tasks.job_description_analysis, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
    communication_analysis_job = analysis_fast_queue.enqueue(tasks.job_communication_analysis, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
    reviews_job = analysis_fast_queue.enqueue(tasks.job_listing_reviews_analysis, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
    price_sanity_job = analysis_fast_queue.enqueue(tasks.job_price_sanity_check, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
    host_profile_job = analysis_fast_queue.enqueue(tasks.job_host_profile_check, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
    reverse_search_job = analysis_heavy_queue.enqueue(tasks.job_reverse_image_search, check_id_str, on_failure=handle_job_failure, result_ttl=3600)
    
    # --- Layer 2: Enqueue jobs that depend on Layer 1 jobs ---
    place_details_job = analysis_fast_queue.enqueue(tasks.job_place_details, check_id_str, depends_on=geocode_job, on_failure=handle_job_failure, result_ttl=3600)
    reputation_job = analysis_fast_queue.enqueue(tasks.job_reputation_check, check_id_str, depends_on=geocode_job, on_failure=handle_job_failure, result_ttl=3600)
    neighborhood_job = analysis_fast_queue.enqueue(tasks.job_neighborhood_analysis, check_id_str, depends_on=geocode_job, on_failure=handle_job_failure, result_ttl=3600)
    ai_detection_job = analysis_heavy_queue.enqueue(tasks.job_ai_image_detection, check_id_str, depends_on=reverse_search_job, on_failure=handle_job_failure, result_ttl=3600)
    
    # --- Layer 3: Enqueue the "meta-analysis" job that synthesizes Layer 1/2 results ---
    online_presence_job = analysis_fast_queue.enqueue(
        tasks.job_online_presence_analysis,
        check_id_str,
        depends_on=[host_profile_job, reputation_job, reverse_search_job],
        on_failure=handle_job_failure,
        result_ttl=3600
    )

    # --- Final Step: The finalizer depends on all "leaf" jobs in the tree ---
    all_final_dependencies = [
        # Independent jobs
        url_forensics_job,
        plagiarism_job,
        description_analysis_job,
        communication_analysis_job,
        reviews_job,
        price_sanity_job,
        # Dependent jobs
        place_details_job,
        neighborhood_job,
        ai_detection_job,
        # The meta-analysis job
        online_presence_job
    ]
    
    analysis_fast_queue.enqueue(
        finalizer.job_aggregate_and_conclude,
        check_id_str,
        depends_on=all_final_dependencies,
        on_failure=handle_job_failure
    )
    
    print(f"Enqueued all analysis jobs for FraudCheck ID: {check_id}.")