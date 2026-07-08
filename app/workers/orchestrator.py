import json
import logging
import uuid
from .queues import analysis_fast_queue, analysis_heavy_queue, redis_conn
from app.workers import tasks, finalizer
from app.workers.utils import handle_job_failure
from app.db.session import SessionLocal
from app.db.models import FraudCheck, JobStatus

logger = logging.getLogger(__name__)

HIGH_RISK_SCORE_THRESHOLD = 70


def _check_historical_fraud(db, check: FraudCheck) -> list[dict]:
    """
    Query DB for previous completed analyses with matching host_email, host_phone,
    or address that had high risk scores. Returns list of warnings.
    """
    warnings = []
    input_data = check.input_data or {}
    host_email = input_data.get("host_email")
    host_phone = input_data.get("host_phone")
    address = input_data.get("address")

    if not any([host_email, host_phone, address]):
        return warnings

    try:
        previous = (
            db.query(FraudCheck)
            .filter(
                FraudCheck.id != check.id,
                FraudCheck.status == JobStatus.COMPLETED,
                FraudCheck.final_report.isnot(None),
            )
            .all()
        )

        for prev in previous:
            prev_input = prev.input_data or {}
            prev_report = prev.final_report or {}
            prev_score = prev_report.get("calculated_risk_score") or prev_report.get("risk_score", 0)

            if prev_score < HIGH_RISK_SCORE_THRESHOLD:
                continue

            matches = []
            if host_email and prev_input.get("host_email") == host_email:
                matches.append(f"email: {host_email}")
            if host_phone and prev_input.get("host_phone") == host_phone:
                matches.append(f"phone: {host_phone}")
            if address and prev_input.get("address") == address:
                matches.append(f"address: {address}")

            if matches:
                warnings.append({
                    "previous_check_id": str(prev.id),
                    "previous_risk_score": prev_score,
                    "matched_fields": matches,
                    "created_at": prev.created_at.isoformat() if prev.created_at else None,
                })

    except Exception as e:
        logger.warning(f"Historical cross-check failed (non-blocking): {e}")

    return warnings


def _handle_job_success(job, connection, result, *args, **kwargs):
    """RQ on_success callback — publishes job progress to Redis for SSE."""
    if not isinstance(result, dict) or "job_name" not in result:
        return
    check_id_str = job.args[0] if job.args else None
    if check_id_str and redis_conn:
        try:
            event = json.dumps({
                "job_name": result.get("job_name", ""),
                "status": result.get("status", ""),
                "description": result.get("description", ""),
            })
            redis_conn.publish(f"analysis:{check_id_str}:progress", event)
        except Exception:
            pass

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
            logger.error(f"FraudCheck ID {check_id} not found.")
            return
        check.status = JobStatus.IN_PROGRESS

        # Historical cross-check: flag if same email/phone/address appeared in previous high-risk analyses
        historical_warnings = _check_historical_fraud(db, check)
        if historical_warnings:
            logger.warning(f"Historical fraud matches found for {check_id}: {len(historical_warnings)} previous high-risk analyses")
            existing_steps = check.analysis_steps or []
            existing_steps.append({
                "job_name": "historical_cross_check",
                "status": "COMPLETED",
                "description": "Previous high-risk analyses found matching this listing's contact info or address",
                "result": {"warnings": historical_warnings},
            })
            check.analysis_steps = existing_steps

        db.commit()
    finally:
        db.close()

    check_id_str = str(check_id)

    # --- Layer 1: Enqueue initial, independent data-gathering jobs ---
    # These can all start immediately.
    geocode_job = analysis_fast_queue.enqueue(tasks.job_geocode, check_id_str, on_failure=handle_job_failure, on_success=_handle_job_success, result_ttl=3600)
    url_forensics_job = analysis_fast_queue.enqueue(tasks.job_url_forensics, check_id_str, on_failure=handle_job_failure, on_success=_handle_job_success, result_ttl=3600)
    plagiarism_job = analysis_fast_queue.enqueue(tasks.job_description_plagiarism_check, check_id_str, on_failure=handle_job_failure, on_success=_handle_job_success, result_ttl=3600)
    description_analysis_job = analysis_fast_queue.enqueue(tasks.job_description_analysis, check_id_str, on_failure=handle_job_failure, on_success=_handle_job_success, result_ttl=3600)
    communication_analysis_job = analysis_fast_queue.enqueue(tasks.job_communication_analysis, check_id_str, on_failure=handle_job_failure, on_success=_handle_job_success, result_ttl=3600)
    reviews_job = analysis_fast_queue.enqueue(tasks.job_listing_reviews_analysis, check_id_str, on_failure=handle_job_failure, on_success=_handle_job_success, result_ttl=3600)
    price_sanity_job = analysis_fast_queue.enqueue(tasks.job_price_sanity_check, check_id_str, on_failure=handle_job_failure, on_success=_handle_job_success, result_ttl=3600)
    host_profile_job = analysis_fast_queue.enqueue(tasks.job_host_profile_check, check_id_str, on_failure=handle_job_failure, on_success=_handle_job_success, result_ttl=3600)
    reverse_search_job = analysis_heavy_queue.enqueue(tasks.job_reverse_image_search, check_id_str, on_failure=handle_job_failure, on_success=_handle_job_success, result_ttl=3600)
    
    # --- Layer 2: Enqueue jobs that depend on Layer 1 jobs ---
    place_details_job = analysis_fast_queue.enqueue(tasks.job_place_details, check_id_str, depends_on=geocode_job, on_failure=handle_job_failure, on_success=_handle_job_success, result_ttl=3600)
    reputation_job = analysis_fast_queue.enqueue(tasks.job_reputation_check, check_id_str, depends_on=geocode_job, on_failure=handle_job_failure, on_success=_handle_job_success, result_ttl=3600)
    neighborhood_job = analysis_fast_queue.enqueue(tasks.job_neighborhood_analysis, check_id_str, depends_on=geocode_job, on_failure=handle_job_failure, on_success=_handle_job_success, result_ttl=3600)
    land_registry_job = analysis_fast_queue.enqueue(tasks.job_land_registry_check, check_id_str, depends_on=geocode_job, on_failure=handle_job_failure, on_success=_handle_job_success, result_ttl=3600)
    ai_detection_job = analysis_heavy_queue.enqueue(tasks.job_ai_image_detection, check_id_str, depends_on=reverse_search_job, on_failure=handle_job_failure, on_success=_handle_job_success, result_ttl=3600)
    
    # --- Layer 3: Enqueue the "meta-analysis" job that synthesizes Layer 1/2 results ---
    online_presence_job = analysis_fast_queue.enqueue(
        tasks.job_online_presence_analysis,
        check_id_str,
        depends_on=[host_profile_job, reputation_job, reverse_search_job, url_forensics_job],
        on_failure=handle_job_failure,
        on_success=_handle_job_success,
        result_ttl=3600
    )

    # --- Final Step: The finalizer depends on all "leaf" jobs in the tree ---
    all_final_dependencies = [
        # Independent jobs
        url_forensics_job,
        plagiarism_job,
        description_analysis_job,
        communication_analysis_job,
        reverse_search_job,
        reviews_job,
        price_sanity_job,
        # Dependent jobs
        place_details_job,
        neighborhood_job,
        ai_detection_job,
        land_registry_job,
        # The meta-analysis job
        online_presence_job
    ]

    analysis_fast_queue.enqueue(
        finalizer.job_aggregate_and_conclude,
        check_id_str,
        depends_on=all_final_dependencies,
        on_failure=handle_job_failure,
        on_success=_handle_job_success,
    )
    
    logger.info(f"Enqueued all analysis jobs for FraudCheck ID: {check_id}.")