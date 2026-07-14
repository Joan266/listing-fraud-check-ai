import concurrent.futures
import json
import logging
import uuid
from datetime import datetime
from app.db.models import FraudCheck

logger = logging.getLogger(__name__)
from app.utils.helpers import generate_hash, get_nested
from app.workers.queues import redis_conn
import re
from app.services import google_search, image_analysis, gemini_analysis, google_apis, url_analysis
from app.db.session import SessionLocal 
from urllib.parse import urlparse
import rq
# --- Constants for Input Limits ---
MAX_REVIEWS_TO_ANALYZE = 10
MAX_IMAGES_TO_ANALYZE = 5

# --- The Caching Helper ---
def _run_cached_job(check_id: str, job_name: str, inputs: dict, task_function):
    """A helper to abstract away the caching logic for each job."""
    data_to_hash = {"job_name": job_name, "inputs": inputs}
    cache_field_key = generate_hash(data_to_hash)
    redis_main_key = f"cache:{check_id}"

    cached_result = redis_conn.hget(redis_main_key, cache_field_key)
    if cached_result:
        logger.debug(f"Cache HIT for {job_name} (Check ID: {check_id})")
        return json.loads(cached_result)

    logger.info(f"Cache MISS for {job_name} (Check ID: {check_id}). Running task...")
    result = task_function(inputs)
    redis_conn.hset(redis_main_key, cache_field_key, json.dumps(result))
    return result

def job_geocode(check_id_arg):
    """
    Validates address with Google Maps and returns a standardized AnalysisStep result.
    """
    # --- 1. Define Job Metadata ---
    job_name = "geocode"
    job_description = "Validates the property address using Google Maps Geocode API and gathers location details."
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg 

    # --- 2. Get Inputs from Database ---
    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check:
            return {"error": f"FraudCheck with ID {check_id} not found."}
        
        inputs = {"address": check.input_data.get("address")}
    finally:
        db.close()

    # --- 3. Handle SKIPPED Case ---
    if not inputs["address"]:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "SKIPPED",
            "inputs_used": inputs,
            "result": {"reason": "No address was provided."}
        }

    # --- 4. Handle COMPLETED and ERROR Cases ---
    try:
        def task(data):
            return google_apis.geocode_address(data["address"])

        task_result = _run_cached_job(str(check_id), job_name, inputs, task)

        if task_result.get("error"):
            raise Exception(task_result.get("error"))

        return {
            "job_name": job_name,
            "description": job_description,
            "status": "COMPLETED",
            "inputs_used": inputs,
            "result": task_result
        }
    except Exception as e:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "ERROR",
            "inputs_used": inputs,
            "result": {"error_message": str(e)}
        }
        

def job_reputation_check(check_id_arg):
    """
    Checks host reputation and returns a standardized AnalysisStep result.
    """
    job_name = "reputation_check"
    job_description = "Searches the web for reports or reviews linked to the host's contact information."
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg 

    db = SessionLocal()
    try:
        # Get country_code from the geocode job dependency
        current_job = rq.get_current_job()
        geocode_result = current_job.dependency.result
        country_code = get_nested(geocode_result, ["result", "country_code"], default='us')

        # Get host details from the database
        db = SessionLocal()
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check: raise Exception("FraudCheck not found")

        inputs = {
            "host_email": check.input_data.get("host_email"),
            "host_phone": check.input_data.get("host_phone"),
            "country_code": country_code
        }
    except Exception as e:
        # This will catch failures in getting the dependency or the DB record
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "ERROR",
            "inputs_used": {"error": str(e)},
            "result": {"reason": "Failed to gather necessary inputs for the job."}
        }
    finally:
        db.close()

    # SKIPPED Case
    if not inputs["host_email"] and not inputs["host_phone"]:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "SKIPPED",
            "inputs_used": inputs,
            "result": {"reason": "No host email and phone provided."}
        }
    try:
        def task(data):
            queries_to_run = google_search.prepare_reputation_queries(data)
            if not queries_to_run:
                return {"search_results_text": ""}

            all_results_text = ""
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future_to_query = {executor.submit(google_search.search_web, query): query for query in queries_to_run}
                for future in concurrent.futures.as_completed(future_to_query):
                    try:
                        search_results = future.result()
                        for item in search_results:
                            all_results_text += f"Title: {item.get('title')}\nSnippet: {item.get('snippet')}\n\n"
                    except Exception as e:
                        logging.error(f"A reputation search query failed: {e}")
            
            if all_results_text:
                return {
                    "summary": "Results found in the internet liking the host email or phone to key words related to fraud in the local language.",
                    "search_results_text": all_results_text.strip()
                }
            return {"summary": "No results found in the internet liking the host email or phone to key words related to fraud in the local language."}

        task_result = _run_cached_job(check_id, "reputation_check", inputs, task)
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "COMPLETED",
            "inputs_used": inputs,
            "result": task_result
        }
    except Exception as e:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "ERROR",
            "inputs_used": inputs,
            "result": {"error_message": str(e)}
        }

def job_description_plagiarism_check(check_id_arg):
    """Checks for description plagiarism and returns a standardized AnalysisStep result."""
    job_name = "description_plagiarism_check"
    job_description = "Performs an exact-match web search to see if the listing description has been copied from other sites."
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg 

    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check: return {"error": "Check not found"}
        inputs = {"description": check.input_data.get("description")}
    finally:
        db.close()
    description = inputs.get("description")
    if not description or len(description) < 150:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "SKIPPED",
            "inputs_used": inputs,
            "result": {"reason": "Description was missing or too short to check."}
        }
    
    try:
        def task(data):
            snippet_to_check = description[:150]

            search_results = google_search.search_web(snippet_to_check, exact_match=True)

            is_plagiarized = len(search_results) > 1

            return {
                "plagiarized": is_plagiarized,
                "summary": "Description found on other websites." if is_plagiarized else "No description duplicates found.",
                "found_urls": [result.get('link') for result in search_results] if is_plagiarized else []
            }

        task_result = _run_cached_job(check_id, "description_plagiarism", inputs, task)
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "COMPLETED",
            "inputs_used": inputs,
            "result": task_result
        }
    except Exception as e:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "ERROR",
            "inputs_used": inputs,
            "result": {"error_message": str(e)}
        }

def job_url_forensics(check_id_arg):
    """
    Performs domain age, blacklist, and archive checks on the listing URL in parallel.
    """
    job_name = "url_forensics"
    job_description = "Performs domain age, blacklist, and archive checks on the listing URL."
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg

    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check: return {"error": "Check not found"}
        inputs = {"listing_url": check.input_data.get("listing_url")}
    finally:
        db.close()
        
    if not inputs["listing_url"]:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "SKIPPED",
            "inputs_used": inputs,
            "result": {"reason": "No listing URL was provided."}
        }
    try:
        def task(data):
            url = data["listing_url"]
            domain_name = urlparse(url).netloc
            results = {}

            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                future_age = executor.submit(url_analysis.check_domain_age, domain_name)
                future_blacklist = executor.submit(url_analysis.check_url_blacklist, url)
                future_archive = executor.submit(url_analysis.check_archive_history, url)

                results["domain_age"] = future_age.result()
                results["blacklist_check"] = future_blacklist.result()
                results["archive_check"] = future_archive.result()
                
            return results

        task_result = _run_cached_job(str(check_id), job_name, inputs, task)
        
        if isinstance(task_result, dict) and task_result.get("error"):
            raise Exception(task_result.get("error"))

        return {
            "job_name": job_name,
            "description": job_description,
            "status": "COMPLETED",
            "inputs_used": inputs,
            "result": task_result
        }
    except Exception as e:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "ERROR",
            "inputs_used": inputs,
            "result": {"error_message": str(e)}
        }

def job_description_analysis(check_id_arg):
    """
    Analyzes description.
    """
    # --- 1. Define Job Metadata ---
    job_name = "description_analysis"
    job_description = "Analyzes the listing description for red flags like pressure tactics or vague details."
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg

    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check: return {"error": "Check not found"}
        inputs = {
            "description": check.input_data.get("description"),
        }
    finally:
        db.close()
    if not inputs["description"]:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "SKIPPED",
            "inputs_used": inputs,
            "result": {"reason": "No description provided."}
        }
        
    try:
        def task(data):
            return gemini_analysis.analyze_description(data["description"])
        
        task_result = _run_cached_job(str(check_id), job_name, inputs, task)

        if task_result.get("error"):
            raise Exception(task_result.get("error"))

        return {
            "job_name": job_name,
            "description": job_description,
            "status": "COMPLETED",
            "inputs_used": inputs,
            "result": task_result
        }
    except Exception as e:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "ERROR",
            "inputs_used": inputs,
            "result": {"error_message": str(e)}
        }

def job_communication_analysis(check_id_arg):
    """
    Analyzes communication text in parallel.
    """
    # --- 1. Define Job Metadata ---
    job_name = "communication_analysis"
    job_description = "Analyzes communication text for fraudulent themes like risky payment requests."
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg

    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check: return {"error": "Check not found"}
        inputs = {
            "communication_text": check.input_data.get("communication_text"),
        }
    finally:
        db.close()
    communication_text = inputs.get("communication_text")

    if not communication_text or len(communication_text) < 50:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "SKIPPED",
            "inputs_used": inputs,
            "result": {"reason": "No communication_text provided."}
        }
        
    try:
        def task(data):
            return gemini_analysis.analyze_communication(data["communication_text"])

        task_result = _run_cached_job(str(check_id), job_name, inputs, task)

        if task_result.get("error"):
            raise Exception(task_result.get("error"))

        return {
            "job_name": job_name,
            "description": job_description,
            "status": "COMPLETED",
            "inputs_used": inputs,
            "result": task_result
        }
    except Exception as e:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "ERROR",
            "inputs_used": inputs,
            "result": {"error_message": str(e)}
        }

def job_listing_reviews_analysis(check_id_arg):
    """Analyzes a limited number of the listing's own reviews."""
    job_name = "listing_reviews_analysis"
    job_description = "Analyzes user-provided reviews for sentiment and potential red flags."
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg 

    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check: return {"error": "Check not found"}
        reviews = (check.input_data.get("reviews") or [])[:MAX_REVIEWS_TO_ANALYZE]
        inputs = {"reviews": reviews}
    finally:
        db.close()
    if not inputs["reviews"]:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "SKIPPED",
            "inputs_used": inputs,
            "result": {"reason": "No reviews were provided."}
        }
    try:
        def task(data):
            return gemini_analysis.analyze_listing_reviews(data["reviews"])
        
        task_result = _run_cached_job(str(check_id), job_name, inputs, task)

        if task_result.get("error"):
            raise Exception(task_result.get("error"))

        return {
            "job_name": job_name,
            "description": job_description,
            "status": "COMPLETED",
            "inputs_used": inputs,
            "result": task_result
        }
    except Exception as e:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "ERROR",
            "inputs_used": inputs,
            "result": {"error_message": str(e)}
        }

def job_reverse_image_search(check_id_arg):
    """Performs reverse image search on a limited number of images."""
    job_name = "reverse_image_search"
    job_description = "Searches the web for each image to detect if they have been stolen or reused from other listings, which is a common scam tactic."
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg 

    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check: return {"error": "Check not found"}
        image_urls = (check.input_data.get("image_urls") or [])[:MAX_IMAGES_TO_ANALYZE]
        inputs = {"image_urls": image_urls}
    finally:
        db.close()

    if not inputs["image_urls"]:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "SKIPPED",
            "inputs_used": inputs,
            "result": {"reason": "No image URLs were provided."}
        }
    try:
        def task(data):
            with concurrent.futures.ThreadPoolExecutor() as executor:
                results = list(executor.map(image_analysis.reverse_image_search, data["image_urls"]))
            return {"reverse_search_results": results}

        task_result = _run_cached_job(str(check_id), job_name, inputs, task)

        if task_result.get("error"):
            raise Exception(task_result.get("error"))

        return {
            "job_name": job_name,
            "description": job_description,
            "status": "COMPLETED",
            "inputs_used": inputs,
            "result": task_result
        }
    except Exception as e:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "ERROR",
            "inputs_used": inputs,
            "result": {"error_message": str(e)}
        }


def job_price_sanity_check(check_id_arg):
    """Performs a price sanity check using Gemini."""
    job_name = "price_sanity_check"
    job_description = "Analyzes the listing price in the context of its location, type, and description to detect if it's suspiciously high or low."
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg 

    db = SessionLocal()
    
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check: return {"error": "Check not found"}
        inputs = {
            "price_details": check.input_data.get("price_details"),
            "property_type": check.input_data.get("property_type"),
            "address": check.input_data.get("address"),
            "description": check.input_data.get("description") 
        }
    finally:
        db.close()
    if not all([inputs["price_details"], inputs["property_type"], inputs["address"],inputs["description"]]):
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "SKIPPED",
            "inputs_used": inputs,
            "result": {"reason": "Missing price, type, description or address for analysis."}
        }
    
    try:
        def task(data):
            return gemini_analysis.check_price_sanity(
                data["price_details"], 
                data["property_type"], 
                data["description"],
                data["address"]
            )
        
        task_result = _run_cached_job(str(check_id), job_name, inputs, task)

        if task_result.get("error"):
            raise Exception(task_result.get("error"))

        return {
            "job_name": job_name,
            "description": job_description,
            "status": "COMPLETED",
            "inputs_used": inputs,
            "result": task_result
        }
    except Exception as e:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "ERROR",
            "inputs_used": inputs,
            "result": {"error_message": str(e)}
        }

def job_host_profile_check(check_id_arg):
    """
    Performs a simple, rule-based check on the host's profile data.
    """
    job_name = "host_profile_check"
    job_description = "Checks the host's profile for red flags like being unverified or very new."
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg

    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check: return {"error": "Check not found"}
        inputs = {"host_profile": check.input_data.get("host_profile")}
    finally:
        db.close()
        
    # SKIPPED Case
    if not inputs["host_profile"]:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "SKIPPED",
            "inputs_used": inputs,
            "result": {"reason": "No host profile data was provided."}
        }
    
    try:
        host_profile = inputs.get("host_profile", {})
        themes = []
        
        if not host_profile.get("is_verified"):
            themes.append("Host profile is not verified.")
        current_year = datetime.now().year
        member_since = str(host_profile.get("member_since", ""))
        if member_since and (str(current_year) in member_since or str(current_year - 1) in member_since):
            themes.append("Host account is very new (created recently).")

        task_result = {"themes": themes}

        return {
            "job_name": job_name,
            "description": job_description,
            "status": "COMPLETED",
            "inputs_used": inputs,
            "result": task_result
        }
    except Exception as e:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "ERROR",
            "inputs_used": inputs,
            "result": {"error_message": str(e)}
        }

def job_iban_country_check(check_id_arg):
    """
    Extracts IBAN numbers from communication text and flags if the bank country
    doesn't match the property country — a strong fraud indicator.
    """
    job_name = "iban_country_check"
    job_description = "Detects IBAN numbers in communication and flags if the bank country doesn't match the property location."

    try:
        current_job = rq.get_current_job()
        geocode_result = current_job.dependency.result
        country_code = get_nested(geocode_result, ["result", "country_code"], default="")
    except Exception as e:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "ERROR",
            "inputs_used": {"dependency_error": str(e)},
            "result": {"reason": "Could not get result from geocode dependency."},
        }

    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg

    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check:
            return {"error": "Check not found"}
        inputs = {
            "communication_text": check.input_data.get("communication_text"),
            "country_code": country_code,
        }
    finally:
        db.close()

    if not inputs["communication_text"]:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "SKIPPED",
            "inputs_used": inputs,
            "result": {"reason": "No communication text provided."},
        }

    try:
        # Normalize text: remove spaces/dashes, uppercase to match IBAN format
        text_clean = re.sub(r'[\s\-]', '', inputs["communication_text"].upper())
        # IBAN: 2-letter country + 2 check digits + up to 30 alphanumeric chars
        iban_pattern = r'[A-Z]{2}\d{2}[A-Z0-9]{11,30}'
        ibans_found = re.findall(iban_pattern, text_clean)

        if not ibans_found:
            return {
                "job_name": job_name,
                "description": job_description,
                "status": "SKIPPED",
                "inputs_used": inputs,
                "result": {"reason": "No IBAN found in communication text."},
            }

        mismatches = []
        for iban in ibans_found:
            iban_country = iban[:2].lower()
            if country_code and iban_country != country_code.lower():
                mismatches.append({
                    "iban_prefix": iban[:8] + "...",
                    "iban_country": iban_country.upper(),
                    "property_country": country_code.upper(),
                })

        if mismatches:
            return {
                "job_name": job_name,
                "description": job_description,
                "status": "COMPLETED",
                "inputs_used": inputs,
                "result": {
                    "is_suspicious": True,
                    "mismatches": mismatches,
                    "reason": f"IBAN country ({mismatches[0]['iban_country']}) does not match property country ({mismatches[0]['property_country']}).",
                },
            }

        return {
            "job_name": job_name,
            "description": job_description,
            "status": "COMPLETED",
            "inputs_used": inputs,
            "result": {
                "is_suspicious": False,
                "ibans_found": len(ibans_found),
                "reason": "IBAN country matches property country.",
            },
        }

    except Exception as e:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "ERROR",
            "inputs_used": inputs,
            "result": {"error_message": str(e)},
        }


def job_address_cross_platform_search(check_id_arg):
    """
    Searches the verified property address on the web to detect if it appears
    on multiple platforms with different hosts or inconsistent details.
    """
    job_name = "address_cross_platform_search"
    job_description = "Searches the property address online to detect duplicate listings by different hosts."

    try:
        current_job = rq.get_current_job()
        geocode_result = current_job.dependency.result
        formatted_address = get_nested(geocode_result, ["result", "formatted_address"])
    except Exception as e:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "ERROR",
            "inputs_used": {"dependency_error": str(e)},
            "result": {"reason": "Could not get result from geocode dependency."},
        }

    inputs = {"formatted_address": formatted_address}

    if not formatted_address:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "SKIPPED",
            "inputs_used": inputs,
            "result": {"reason": "No verified address available."},
        }

    try:
        def task(data):
            results = google_search.search_web(f'"{data["formatted_address"]}"')
            if not results:
                return {"verdict": "not_evaluable", "reason": "No results found for this address.", "platforms_found": []}
            return gemini_analysis.analyze_cross_platform_results(results, data["formatted_address"])

        task_result = _run_cached_job(str(check_id_arg), job_name, inputs, task)

        if task_result.get("error"):
            raise Exception(task_result.get("error"))

        return {
            "job_name": job_name,
            "description": job_description,
            "status": "COMPLETED",
            "inputs_used": inputs,
            "result": task_result,
        }
    except Exception as e:
        return {
            "job_name": job_name,
            "description": job_description,
            "status": "ERROR",
            "inputs_used": inputs,
            "result": {"error_message": str(e)},
        }