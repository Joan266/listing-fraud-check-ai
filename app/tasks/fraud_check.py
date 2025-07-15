# app/tasks/fraud_checker.py
from app.db.database import SessionLocal
from app.db.models import FraudCheck, JobStatus
from app.services import google_apis, gemini_analysis, google_search, image_analysis
import uuid
import logging

logger = logging.getLogger(__name__)

def run_fraud_check_task(job_id: str):
    """
    Orchestrates a comprehensive fraud analysis on a rental listing.
    This task is designed to be run in the background.
    """
    db = SessionLocal()
    db_job = None
    try:
        logger.info(f"Starting Fraud Check Task for job_id: {job_id}")
        job_uuid = uuid.UUID(job_id)
        db_job = db.query(FraudCheck).filter(FraudCheck.id == job_uuid).first()

        if not db_job:
            logger.error(f"Job {job_id} not found.")
            return

        db_job.status = JobStatus.IN_PROGRESS
        db.commit()

        # 1. --- Data Loading and Reconciliation ---
        input_data = db_job.input_data
        raw_listing_text = input_data.get("rawListing")

        extracted_data = {}
        if raw_listing_text:
            logger.info("Raw listing text found, extracting data with Gemini...")
            extracted_data = gemini_analysis.extract_data_from_paste(raw_listing_text)

        # Reconcile data: manual user input takes priority over extracted data.
        address = input_data.get("address") or extracted_data.get("address")
        listing_description = input_data.get("description") or extracted_data.get("extracted_description")
        image_urls = input_data.get("image_urls", []) or extracted_data.get("image_urls", [])
        communication_text = input_data.get("communication_text")
        listing_reviews = extracted_data.get("extracted_reviews", [])

        if not address:
            raise ValueError("An address is required to perform the analysis.")

        red_flags = []
        positive_signals = []

        # 2. --- Initial Address Validation ---
        # This is the first and most critical check.
        place_data = google_apis.validate_address_and_get_place_details(address)
        if place_data.get("validation_result") != "PERFECT_MATCH":
            red_flags.append({
                "type": "Address Validation", 
                "message": "The provided address could not be accurately verified on Google Maps. This is a major red flag.", 
                "severity": "High"
            })
            listing_summary = {"address": address} # Provide at least the address
            _finalize_report(db, db_job, 0, "Analysis halted: Address is invalid.", red_flags, [], listing_summary, place_data)
            return
        else:
            positive_signals.append({
                "type": "Address Verified", "message": "Address corresponds to a real location on Google Maps.", "category": "location"
            })

        # 3. --- Universal Analysis on Provided Listing Data ---
        # These checks run for ALL listings with a valid address.
        host_name = extracted_data.get("host_name")
        if host_name:
            host_repo_result = google_search.check_host_reputation(host_name)
            if host_repo_result.get("issue_found"):
                red_flags.append({"type": "Host Reputation", "message": host_repo_result.get("summary"), "severity": "High"})

        price_details = extracted_data.get("price_details", {})
        property_type = extracted_data.get("property_type")
        if price_details and property_type and address:
            price_sanity_result = gemini_analysis.check_price_sanity(price_details, property_type, address)
            if price_sanity_result.get("verdict") == "suspiciously_low":
                red_flags.append({"type": "Price Analysis", "message": price_sanity_result.get("reason"), "severity": "High"})
            elif price_sanity_result.get("verdict") == "reasonable":
                # NEW: Add a positive signal for a reasonable price
                positive_signals.append({
                    "type": "Price is Reasonable", "message": price_sanity_result.get("reason"), "category": "general"
                })
        # 3a. Image Analysis
        if image_urls:
            for url in image_urls:
                reuse_result = image_analysis.stronger_reverse_image_search(url)
                if reuse_result.get("is_reused"):
                    red_flags.append({
                        "type": "Image Analysis", "message": reuse_result.get("reason"),
                        "severity": reuse_result.get("severity", "Medium"), "image_url": url
                    })
                    continue  # If it's a stock photo, no need to check for AI artifacts

                ai_result = image_analysis.check_for_ai_artifacts(url)
                if ai_result.get("is_ai"):
                    red_flags.append({
                        "type": "Image Analysis", "message": f"Image may be AI-generated. Reason: {ai_result.get('reason')}",
                        "severity": "High", "image_url": url
                    })
        
        # 3b. Description Analysis
        if listing_description:
            # Check for suspicious themes in the text
            desc_themes = gemini_analysis.analyze_description_text(listing_description).get("themes", [])
            for theme in desc_themes:
                red_flags.append({"type": "Description Analysis", "message": theme, "severity": "Medium"})
            
            # Check for plagiarism
            desc_sample = " ".join(listing_description.split()[:25]) # Use a slightly longer sample
            plagiarism_result = google_search.find_description_duplicates(f'"{desc_sample}"', get_count=True)
            if plagiarism_result.get("total_results", 0) > 1:
                red_flags.append({
                    "type": "Description Analysis", "message": "The listing description was found on other websites, indicating it might be copied.",
                    "severity": "Medium"
                })

        # 3c. Communication Analysis
        if communication_text:
            comm_analysis = gemini_analysis.analyze_communication(communication_text)
            for theme in comm_analysis.get("themes", []):
                red_flags.append({"type": "Communication Analysis", "message": theme, "severity": "High"})

        # 4. --- Path-Specific Analysis ---
        # Now we perform checks that depend on whether it's a business or private residence.

        if place_data.get('business_status') == 'OPERATIONAL':
            logger.info("Verified business found. Performing comparison and reputation checks.")
            if place_data.get('rating') and place_data.get('rating') < 3.5:
                red_flags.append({"type": "Low Google Rating", "message": f"The business has a low public rating of {place_data.get('rating')}/5 on Google.", "severity": "Medium"})
            
            if place_data.get('user_ratings_total') is not None and place_data.get('user_ratings_total') < 10:
                red_flags.append({"type": "Low Review Count", "message": f"The business has very few public reviews ({place_data.get('user_ratings_total')}) on Google.", "severity": "Low"})
            google_reviews = place_data.get('reviews')
            if google_reviews:
                google_review_analysis = gemini_analysis.analyze_reviews_with_gemini(google_reviews)
                for theme in google_review_analysis.get("themes", []):
                    red_flags.append({
                        "type": "Google Review Analysis", 
                        "message": f"A public Google review mentioned a potential issue: '{theme}'", 
                        "severity": "High"
                    })
        

            # Analyze Google's own description for suspicious language
            google_description = place_data.get('description')
            if google_description:
                google_desc_analysis = gemini_analysis.analyze_description_text(google_description)
                for theme in google_desc_analysis.get("themes", []):
                    red_flags.append({
                        "type": "Google Description Analysis", 
                        "message": f"The public Google description contains potentially suspicious language: '{theme}'", 
                        "severity": "Medium"
                    })

            if place_data.get('description'):
                consistency_result = gemini_analysis.check_description_consistency(listing_description, place_data.get('description'))
                if not consistency_result.get("is_consistent"):
                    red_flags.append({"type": "Data Inconsistency", "message": consistency_result.get("reason"), "severity": "High"})
            
            if place_data.get('reviews'):
                consistency_result = gemini_analysis.check_review_consistency(listing_reviews, place_data.get('reviews'))
                if not consistency_result.get("is_consistent"):
                    red_flags.append({"type": "Data Inconsistency", "message": consistency_result.get("reason"), "severity": "High"})
            
            # 4b. External Reputation Check
            property_name = place_data.get('name', address)
            reputation_result = google_search.check_external_reputation(property_name, place_data.get('address_components', []))
            if reputation_result.get("issue_found"):
                red_flags.append({"type": "External Reputation", "message": reputation_result.get("summary"), "severity": "High"})

        else:
            logger.info("Address is a private residence or unverified. Skipping business-specific checks.")
            red_flags.append({"type": "Info", "message": "This is a private residence. Analysis relies solely on provided data.", "severity": "Low"})

        # 5. --- Final Synthesis, Scoring, and Saving ---
        logger.info(f"Finalizing report with {len(red_flags)} red flags and {len(positive_signals)} positive signals.")
        listing_summary = {
            "address": address,
            "property_type": extracted_data.get("property_type", "N/A"),
            "host_name": host_name or "N/A",
            "price": price_details.get("price_per_month") or price_details.get("price_per_night", "N/A")
        }
        final_score = _calculate_risk_score(red_flags)
        synthesis_data = {
            "listing_description": listing_description,
            "listing_reviews": listing_reviews,
            "property_type": extracted_data.get("property_type"),
            "listing_rating": extracted_data.get("listing_rating"),
            "place_data": place_data,
            "red_flags": red_flags,
            "positive_signals": positive_signals
        }
        final_summary = gemini_analysis.synthesize_final_report(synthesis_data)
        _finalize_report(db, db_job, final_score, final_summary, red_flags, place_data)

    except Exception as e:
        logger.error(f"Fraud Check Task failed for job_id {job_id}: {e}", exc_info=True)
        if db_job:
            db_job.status = JobStatus.FAILED
            db_job.result = {"error": str(e)}
            db.commit()
    finally:
        db.close()

def _calculate_risk_score(red_flags: list) -> int:
    """Calculates a final risk score based on the collected red flags."""
    risk_weights = {
        "Address Validation": 40, "Data Inconsistency": 35, 
        "External Reputation": 30, "Host Reputation": 30, 
        "Image Analysis": 25, "Communication Analysis": 40, 
        "Description Analysis": 15, "Price Analysis": 35,
        "Google Review Analysis": 20, "Google Description Analysis": 10, 
        "Low Google Rating": 15, "Low Review Count": 5, 
        "Info": 0,
    }
    
    severity_multiplier = {"Low": 0.5, "Medium": 1.0, "High": 1.5}
    
    score = 100
    for flag in red_flags:
        base_weight = risk_weights.get(flag["type"], 10)
        multiplier = severity_multiplier.get(flag["severity"], 1.0)
        score -= (base_weight * multiplier)
        
    return max(0, int(score))

def _finalize_report(db, db_job, final_score, summary, red_flags, positive_signals, listing_summary, place_data):
    """
    Formats and saves the final, enhanced report to the database.
    """
    
    def format_signals(signals: list, signal_type: str) -> list:
        formatted_list = []
        for i, signal in enumerate(signals):
            item = {
                "id": f"{signal_type}-{i}",
                "title": signal["type"],
                "description": signal["message"],
                "category": signal.get("category", "general"),
            }
            if signal_type == 'alert':
                item["severity"] = signal.get("severity", "medium").lower()
                if "image_url" in signal:
                    item["image_url"] = signal["image_url"]
            formatted_list.append(item)
        return formatted_list

    final_alerts = format_signals(red_flags, 'alert')
    final_positives = format_signals(positive_signals, 'positive')
    
    # NEW: The enhanced final report structure
    final_report = {
        "trustScore": final_score,
        "executiveSummary": summary,
        "listing_summary": listing_summary,
        "location": {
            "lat": place_data.get('geometry', {}).get('location', {}).get('lat'),
            "lng": place_data.get('geometry', {}).get('location', {}).get('lng'),
            "verified": place_data.get("validation_result") == "PERFECT_MATCH"
        },
        "alerts": final_alerts,
        "positive_signals": final_positives,
        "raw_google_data": None # Avoid sending large raw data object to the frontend
    }
    
    db_job.result = final_report
    db_job.status = JobStatus.COMPLETED
    db.commit()
    logger.info(f"Completed fraud check for job_id: {db_job.id}. Final Score: {final_score}")

    """Formats and saves the final report to the database."""
    
    def format_alerts(flags):
        alerts = []
        # Simplified category mapping
        category_map = {
            "Image Analysis": "image", "Communication Analysis": "communication",
            "Address Validation": "location", "Data Inconsistency": "general",
            "External Reputation": "general", "Description Analysis": "general"
        }
        for i, flag in enumerate(flags):
            alerts.append({
                "id": f"alert-{i}", "title": flag["type"], "description": flag["message"],
                "category": category_map.get(flag["type"], "general"), 
                "severity": flag["severity"].lower(),
                "image_url": flag.get("image_url") # Pass along image_url if it exists
            })
        return alerts

    final_alerts = format_alerts(red_flags)
    
    final_report = {
        "trustScore": final_score,
        "executiveSummary": summary,
        "location": {
            "lat": place_data.get('geometry', {}).get('location', {}).get('lat'),
            "lng": place_data.get('geometry', {}).get('location', {}).get('lng'),
            "verified": place_data.get("validation_result") == "PERFECT_MATCH"
        },
        "alerts": final_alerts,
        "raw_google_data": place_data if "error" not in place_data else None
    }
    
    db_job.result = final_report
    db_job.status = JobStatus.COMPLETED
    db.commit()
    logger.info(f"Completed fraud check for job_id: {db_job.id}. Final Score: {final_score}")