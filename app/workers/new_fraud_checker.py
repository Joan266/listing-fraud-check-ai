import asyncio
import uuid
import logging
from app.db.session import SessionLocal
from app.db.models import FraudCheck, JobStatus
from app.services import google_apis, gemini_analysis, google_search, image_analysis
from app.core.queue import q 

logger = logging.getLogger(__name__)
async def _run_tier_1_async(address, listing_description):
    """Core async logic for Tier 1."""
    tasks = [
        google_apis.validate_address_and_get_place_details(address),
        gemini_analysis.analyze_description_text(listing_description)
    ]
    place_data, desc_analysis = await asyncio.gather(*tasks)
    return place_data, desc_analysis

def run_tier_1_checks(job_id: str):
    """
    RQ Job for Tier 1: Address and Basic Text Validation.
    """
    db = SessionLocal()
    try:
        logger.info(f"Starting Fraud Check Task for job_id: {job_id}")
        job_uuid = uuid.UUID(job_id)
        db_job = db.query(FraudCheck).filter(FraudCheck.id == job_uuid).first()
        if not db_job:
            logger.error(f"Job {job_id} not found.")
            return

        db_job.status = JobStatus.IN_PROGRESS
        db.commit()

        input_data = db_job.input_data
        raw_listing_text = input_data.get("rawListing")

        extracted_data = {}
        if raw_listing_text:
            logger.info(f"Job {job_id}: Raw text found, extracting data with Gemini...")
            extracted_data = gemini_analysis.extract_data_from_paste(raw_listing_text)

        reconciled_data = {
            "listing_url": input_data.get("listing_url"),
            "address": input_data.get("address") or extracted_data.get("address"),
            "description": input_data.get("description") or extracted_data.get("extracted_description"),
            "image_urls": input_data.get("image_urls", []),
            "communication_text": input_data.get("communication_text"),
            "listing_reviews": extracted_data.get("extracted_reviews", []),
            "host_name": extracted_data.get("host_name"),
            "property_type": extracted_data.get("property_type"),
            "price_details": extracted_data.get("price_details", {})
        }

        if not reconciled_data.get("address"):
            raise ValueError("An address is required to perform the analysis.")
        
        partial_results = db_job.partial_results.copy()
        partial_results["reconciled_data"] = reconciled_data
        db_job.partial_results = partial_results
        db.commit()
        
        place_data, desc_analysis = asyncio.run(
            _run_tier_1_async(reconciled_data["address"], reconciled_data["description"])
        )
        
       # Update results
        partial_results["place_data"] = place_data
        if desc_analysis.get("themes"):
            # ... add themes to partial_results["red_flags"] ...

        # Circuit Breaker Logic
        if place_data.get("validation_result") != "PERFECT_MATCH":
            partial_results["red_flags"].append({"type": "Address Validation", "message": "Invalid address.", "severity": "High"})
            _finalize_report(db, db_job) # Finalize and STOP
            return

        # Save results and enqueue next tier
        db_job.partial_results = partial_results
        db_job.status = JobStatus.TIER1_COMPLETE
        db.commit()
        q.enqueue(run_tier_2_checks, job_id)

    finally:
        db.close()
def run_tier_1_checks(job_id: str):
    """RQ Job for Tier 1: Address and Basic Text Validation."""
    db = SessionLocal()
    try:
        db_job = db.query(FraudCheck).filter(FraudCheck.id == uuid.UUID(job_id)).first()
        if not db_job: return

        db_job.status = JobStatus.IN_PROGRESS
        db.commit()

        # Load data from the DB
        partial_results = db_job.partial_results.copy()
        address = db_job.input_data.get("address") or partial_results["extracted_data"].get("address")
        listing_description = db_job.input_data.get("description") or partial_results["extracted_data"].get("extracted_description")
        
        place_data, desc_analysis = asyncio.run(_run_tier_1_async(address, listing_description))
        
        # Update results
        partial_results["place_data"] = place_data
        if desc_analysis.get("themes"):
            # ... add themes to partial_results["red_flags"] ...

        # Circuit Breaker Logic
        if place_data.get("validation_result") != "PERFECT_MATCH":
            partial_results["red_flags"].append({"type": "Address Validation", "message": "Invalid address.", "severity": "High"})
            _finalize_report(db, db_job) # Finalize and STOP
            return

        # Save results and enqueue next tier
        db_job.partial_results = partial_results
        db_job.status = JobStatus.TIER1_COMPLETE
        db.commit()
        q.enqueue(run_tier_2_checks, job_id)

    finally:
        db.close()

# --- TIER 2: Moderate-Cost Parallel Checks ---
async def _run_tier_2_async(image_urls, host_name, property_name, address_components):
    """Core async logic for Tier 2."""
    tasks = [
        image_analysis.stronger_reverse_image_search_all(image_urls), # Assumes a function that loops async
        Google Search.check_host_reputation(host_name),
        Google Search.check_external_reputation(property_name, address_components)
    ]
    image_flags, host_flags, property_flags = await asyncio.gather(*tasks)
    return image_flags, host_flags, property_flags

def run_tier_2_checks(job_id: str):
    """RQ Job for Tier 2: Image Reuse and Reputation."""
    db = SessionLocal()
    try:
        db_job = db.query(FraudCheck).filter(FraudCheck.id == uuid.UUID(job_id)).first()
        # ... load data from db_job.partial_results and db_job.input_data ...
        
        image_flags, host_flags, property_flags = asyncio.run(_run_tier_2_async(...))
        
        # ... add new flags to partial_results["red_flags"] ...
        
        # Circuit Breaker Logic
        if any(flag.get("severity") == "High" for flag in image_flags):
             _finalize_report(db, db_job) # Finalize and STOP
             return

        # Save results and enqueue next tier
        db_job.partial_results = partial_results
        db_job.status = JobStatus.TIER2_COMPLETE
        db.commit()
        q.enqueue(run_tier_3_and_finalize, job_id)
        
    finally:
        db.close()

# --- TIER 3 & FINALIZATION ---
def run_tier_3_and_finalize(job_id: str):
    """RQ Job for Tier 3: Highest-cost checks and final report generation."""
    db = SessionLocal()
    try:
        db_job = db.query(FraudCheck).filter(FraudCheck.id == uuid.UUID(job_id)).first()
        # ... load all necessary data from db_job ...

        # --- Run final, most expensive checks (e.g., AI image detection, consistency) ---
        # These can also be run in parallel with another asyncio block.
        # ... add any new flags to partial_results["red_flags"] ...
        
        # All checks are done, now generate the final report
        _finalize_report(db, db_job)
        
    finally:
        db.close()

# --- FINAL REPORTING (Helper Function) ---
def _finalize_report(db, db_job):
    """
    Takes the final state from the DB, calculates score, generates summary,
    and saves the completed report.
    """
    partial_results = db_job.partial_results
    red_flags = partial_results["red_flags"]
    positive_signals = partial_results["positive_signals"]
    
    final_score = _calculate_risk_score(red_flags)
    
    # ... create synthesis_data dict from partial_results and db_job.input_data ...
    summary = gemini_analysis.synthesize_final_report(synthesis_data)

    # ... format final_report dictionary ...
    
    db_job.result = final_report
    db_job.status = JobStatus.COMPLETED
    db.commit()
    logger.info(f"Completed fraud check for job_id: {db_job.id}. Final Score: {final_score}")