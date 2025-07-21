# in a file like app/jobs.py

from app.db.session import get_db
from app.db.models import FraudCheck, JobStatus
from app.queues import analysis_fast_queue, analysis_heavy_queue

# Assume these are your job functions, defined elsewhere in this file
from .tasks import job_geocode_places, job_reputation_check, job_text_analysis, job_image_analysis, job_aggregate_and_conclude

def start_full_analysis(check_id: int):
    """
    This orchestrator job fans out all individual tasks for a given fraud check.
    It's designed to be fast, reliable, and idempotent.
    """
    print(f"Starting orchestration for FraudCheck ID: {check_id}")
    
    # Use a 'with' statement for the database session to ensure it's closed properly
    with get_db() as db:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check:
            print(f"Error: FraudCheck ID {check_id} not found.")
            return

        # Set status to IN_PROGRESS to signal work has started
        check.status = JobStatus.IN_PROGRESS
        db.commit()

        # Enqueue all the individual analysis jobs
        # Each job function just needs the check_id to look up its own data
        plagiarism_job = analysis_fast_queue.enqueue(job_description_plagiarism_check, check_id, depends_on=prep_job)
        # in app/workers/orchestrator.py
        geocode_job = analysis_fast_queue.enqueue(job_geocode_places, check_id, depends_on=prep_job)
        # The reputation job now depends on the geocode_job
        reputation_job = analysis_fast_queue.enqueue(job_reputation_check, check_id, depends_on=geocode_job)
        text_job = analysis_fast_queue.enqueue(job_text_analysis, check_id)
                
        image_job = analysis_heavy_queue.enqueue(job_image_analysis, check_id)

        # Collect all the analysis jobs to create a dependency
        all_analysis_jobs = [geocode_job, reputation_job, text_job, image_job]

        # Enqueue the final aggregation job, which depends on all the others
        # This job will not start until all jobs in `all_analysis_jobs` have succeeded
        final_job = analysis_fast_queue.enqueue(
            job_aggregate_and_conclude,
            check_id,
            depends_on=all_analysis_jobs
        )
        print(f"All jobs for FraudCheck ID: {check_id} have been enqueued. Final job ID: {final_job.id}")