import concurrent.futures
import json
import logging
import uuid
from app.db.models import FraudCheck
from app.utils.helpers import generate_hash
from app.workers.queues import redis_conn
from app.services import google_search, image_analysis, gemini_analysis, google_apis, url_analysis
from app.db.session import SessionLocal 
from urllib.parse import urlparse

# --- Constants for Input Limits ---
MAX_REVIEWS_TO_ANALYZE = 10
MAX_IMAGES_TO_ANALYZE = 10
# --- The Caching Helper ---
def _run_cached_job(check_id: str, job_name: str, inputs: dict, task_function):
    """A helper to abstract away the caching logic for each job."""
    data_to_hash = {"job_name": job_name, "inputs": inputs}
    cache_field_key = generate_hash(data_to_hash)
    redis_main_key = f"cache:{check_id}"

    cached_result = redis_conn.hget(redis_main_key, cache_field_key)
    if cached_result:
        print(f"✅ Cache HIT for {job_name} (Check ID: {check_id})")
        return json.loads(cached_result)

    print(f"⚙️ Cache MISS for {job_name} (Check ID: {check_id}). Running task...")
    result = task_function(inputs)
    redis_conn.hset(redis_main_key, cache_field_key, json.dumps(result))
    return result

def job_geocode_places(check_id_arg):
    """Validates address and gets place details from Google Maps."""
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg 

    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check: return {"error": "Check not found"}
        inputs = {"address": check.input_data.get("address")}
    finally:
        db.close()

    if not inputs["address"]:
        return {"error": "Address not found, skipping geocode."}

    def task(data):
        return google_apis.validate_address_and_get_place_details(data["address"])
        
    return _run_cached_job(check_id, "geocode", inputs, task)


def job_reputation_check(check_id_arg):
    """Checks reputation by running parallel Google searches for host identifiers."""
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg 

    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check: return {"error": "Check not found"}
        
        address = check.input_data.get("address")
        if not address:
            return {"status": "No address to get country_code."}

        geocode_inputs = {"address": address}
        geocode_cache_key = generate_hash({"job_name": "geocode", "inputs": geocode_inputs})
        cached_data = redis_conn.hget(f"cache:{check_id}", geocode_cache_key)
        google_places_data = json.loads(cached_data) if cached_data else {}
        country_code = google_places_data.get("country_code", "us")

        inputs = {
            "host_name": check.input_data.get("host_name"),
            "email": check.input_data.get("email"),
            "phone": check.input_data.get("phone"),
            "country_code": country_code
        }
    finally:
        db.close()

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
        
        return {"search_results_text": all_results_text.strip()}

    return _run_cached_job(check_id, "reputation_check", inputs, task)

def job_description_plagiarism_check(check_id_arg):
    """Checks for plagiarism in the listing description."""
    
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

    def task(data):
        description = data.get("description")
        if not description or len(description) < 150:
            return {"plagiarized": False, "summary": "Description too short to check."}

        snippet_to_check = description[:200]

        search_results = google_search.search_web(snippet_to_check, exact_match=True)

        if len(search_results) > 1:
            return {
                "plagiarized": True,
                "summary": "Description found on other websites.",
                "found_urls": [result.get('link') for result in search_results]
            }
        return {"plagiarized": False, "summary": "No description duplicates found."}

    return _run_cached_job(check_id, "description_plagiarism", inputs, task)

def job_reverse_image_search(check_id_arg):
    """Performs reverse image search on a limited number of images."""
    
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
        return {"status": "No images provided, skipping."}

    def task(data):
        with concurrent.futures.ThreadPoolExecutor() as executor:
            results = list(executor.map(image_analysis.reverse_image_search, data["image_urls"]))
        return {"reverse_search_results": results}

    return _run_cached_job(check_id, "reverse_image_search", inputs, task)


def job_ai_image_detection(check_id_arg):
    """Checks for AI artifacts on images not already flagged as reused."""
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg 

    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check: return {"error": "Check not found"}
        initial_urls = (check.input_data.get("image_urls") or [])[:MAX_IMAGES_TO_ANALYZE]
    finally:
        db.close()

    if not initial_urls:
        return {"status": "No images to process."}

    # FIX: Correctly regenerate the cache key for the dependency job
    reverse_search_inputs = {"image_urls": initial_urls}
    reverse_search_cache_key = generate_hash({
        "job_name": "reverse_image_search",
        "inputs": reverse_search_inputs
    })
    cached_data = redis_conn.hget(f"cache:{check_id}", reverse_search_cache_key)
    reverse_search_results = json.loads(cached_data).get("reverse_search_results", []) if cached_data else []

    images_to_check = [res['url'] for res in reverse_search_results if not res.get('is_reused')]
    if not images_to_check:
        return {"status": "No unique images to check for AI artifacts."}

    inputs = {"image_urls": images_to_check}

    def task(data):
        with concurrent.futures.ThreadPoolExecutor() as executor:
            results = list(executor.map(image_analysis.check_for_ai_artifacts, data["image_urls"]))
        return {"ai_detection_results": results}

    return _run_cached_job(check_id, "ai_image_detection", inputs, task)

def job_text_analysis(check_id_arg):
    """Analyzes description and communication text in parallel."""
    
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
            "communication_text": check.input_data.get("communication_text"),
        }
    finally:
        db.close()

    def task(data):
        results = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = {}
            if data.get("description"):
                futures[executor.submit(gemini_analysis.analyze_description, data["description"])] = "description_analysis"
            if data.get("communication_text"):
                futures[executor.submit(gemini_analysis.analyze_communication, data["communication_text"])] = "communication_analysis"
            
            for future in concurrent.futures.as_completed(futures):
                analysis_type = futures[future]
                results[analysis_type] = future.result()

        if not results:
            return {"status": "Skipped due to missing description and communication data."}

        return results
    
    return _run_cached_job(str(check_id), "text_analysis", inputs, task)

def job_listing_reviews_analysis(check_id_arg):
    """Analyzes a limited number of the listing's own reviews."""
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg 

    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check: return {"error": "Check not found"}
        reviews = check.input_data.get("reviews", [])[:MAX_REVIEWS_TO_ANALYZE]
        inputs = {"reviews": reviews}
    finally:
        db.close()

    def task(data):
        if not data["reviews"]:
            return {"status": "No listing reviews to analyze."}
        return gemini_analysis.analyze_listing_reviews(data["reviews"])

    return _run_cached_job(check_id, "listing_reviews_analysis", inputs, task)

def job_price_and_host_check(check_id_arg):
    """Performs price sanity and host profile analysis in parallel."""
    
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
            "host_profile": check.input_data.get("host_profile"),
            "description": check.input_data.get("description") 
        }
    finally:
        db.close()

    def task(data):
        results = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = {}
            
            # Update the condition to check for description as well
            if all([data.get("price_details"), data.get("property_type"), data.get("address"), data.get("description")]):
                futures[executor.submit(
                    gemini_analysis.check_price_sanity, 
                    data["price_details"], 
                    data["property_type"], 
                    data["address"],
                    data["description"]
                )] = "price_analysis"
            
            if data.get("host_profile"):
                futures[executor.submit(gemini_analysis.analyze_host_profile, data["host_profile"])] = "host_analysis"
            
            for future in concurrent.futures.as_completed(futures):
                analysis_type = futures[future]
                results[analysis_type] = future.result()
        
        if not results:
            return {"status": "Skipped due to missing price and host data."}
            
        return results
    
    # Use str(check_id) for caching key consistency
    return _run_cached_job(str(check_id), "price_and_host_check", inputs, task)
def job_google_places_analysis(check_id_arg):
    """Compares listing data against verified Google Places data."""
    
    if isinstance(check_id_arg, str):
        check_id = uuid.UUID(check_id_arg)
    else:
        check_id = check_id_arg 

    db = SessionLocal()
    try:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
        if not check: return {"error": "Check not found"}
        
        address = check.input_data.get("address")
        if not address:
            return {"status": "No address to perform Google Places analysis."}

        geocode_inputs = {"address": address}
        geocode_cache_key = generate_hash({"job_name": "geocode", "inputs": geocode_inputs})
        cached_data = redis_conn.hget(f"cache:{check_id}", geocode_cache_key)
        google_places_data = json.loads(cached_data) if cached_data else {}

        if not google_places_data or google_places_data.get("error"):
            return {"status": "Skipping due to invalid geocode result."}

        inputs = {
            "listing_data": {
                # Add the description to the data being passed
                "description": check.input_data.get("description"), 
                "reviews": check.input_data.get("reviews", [])[:MAX_REVIEWS_TO_ANALYZE]
            },
            "google_places_data": {
                "description": google_places_data.get("editorial_summary", {}).get("overview"), # Get Google's description
                "reviews": google_places_data.get("reviews", [])
            }
        }
    finally:
        db.close()

    def task(data):
         return gemini_analysis.check_data_consistency(
            data["listing_data"], data["google_places_data"]
        )

    return _run_cached_job(check_id, "google_places_analysis", inputs, task)

def job_url_forensics(check_id_arg):
    """
    Performs domain age, blacklist, and archive checks on the listing URL in parallel.
    """
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

    if not inputs.get("listing_url"):
        return {"status": "No listing URL provided, skipping."}

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

    return _run_cached_job(str(check_id), "url_forensics", inputs, task)