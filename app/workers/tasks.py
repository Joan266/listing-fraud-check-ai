import concurrent.futures
import json
import logging
from app.db.session import get_db
from app.db.models import FraudCheck
from app.utils.helpers import generate_cache_key
from app.queues import redis_conn
from app.services import google_search, image_analysis, gemini_analysis

# --- Constants for Input Limits ---
MAX_REVIEWS_TO_ANALYZE = 10
MAX_IMAGES_TO_ANALYZE = 10

# --- Constants for Input Limits ---
MAX_REVIEWS_TO_ANALYZE = 10
MAX_IMAGES_TO_ANALYZE = 10
# --- The Caching Helper ---
def _run_cached_job(check_id: str, job_name: str, inputs: dict, task_function):
    """A helper to abstract away the caching logic for each job."""
    data_to_hash = {"job_name": job_name, "inputs": inputs}
    cache_field_key = generate_cache_key(data_to_hash)
    redis_main_key = f"cache:{check_id}"

    cached_result = redis_conn.hget(redis_main_key, cache_field_key)
    if cached_result:
        print(f"✅ Cache HIT for {job_name} (Check ID: {check_id})")
        return json.loads(cached_result)

    print(f"⚙️ Cache MISS for {job_name} (Check ID: {check_id}). Running task...")
    result = task_function(inputs)
    redis_conn.hset(redis_main_key, cache_field_key, json.dumps(result))
    return result

def job_geocode_places(check_id: str):
    """Validates address and gets place details from Google Maps."""
    with get_db() as db:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
    
    inputs = {"address": check.input_data.get("address")}
    if not inputs["address"]:
        return {"error": "Address not found, skipping geocode."}

    def task(data):
        return gemini_analysis.validate_address_and_get_place_details(data["address"])
        
    return _run_cached_job(check_id, "geocode", inputs, task)


def job_reputation_check(check_id: str):
    """
    Checks reputation by running parallel Google searches for host identifiers.
    """
    with get_db() as db:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
    
    address = check.input_data.get("address")
    if not address:
        return {"status": "No address to get country_code, skipping reputation check."}
        
    # FIX: Correctly regenerate the cache key for the geocode job to get the country
    geocode_inputs = {"address": address}
    geocode_cache_key = generate_cache_key({"job_name": "geocode", "inputs": geocode_inputs})
    cached_data = redis_conn.hget(f"cache:{check_id}", geocode_cache_key)
    google_places_data = json.loads(cached_data) if cached_data else {}
    country_code = google_places_data.get("country_code", "us")

    # This is the dictionary that will be hashed for this job's cache key
    inputs = {
        "host_name": check.input_data.get("host_name"),
        "email": check.input_data.get("email"),
        "phone": check.input_data.get("phone"),
        "country_code": country_code
    }

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

def job_description_plagiarism_check(check_id: str):
    """Checks for plagiarism in the listing description."""
    with get_db() as db:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
    
    inputs = {"description": check.input_data.get("description")}

    def task(data):
        description = data.get("description")
        if not description or len(description) < 150:
            return {"plagiarized": False, "summary": "Description too short to check."}

        sentences = [s.strip() for s in description.split('.') if len(s.strip()) > 50]
        if not sentences:
            return {"plagiarized": False, "summary": "No suitable sentences found."}

        sentence_to_check = sentences[len(sentences) // 2]
        search_results = google_search.search_web(sentence_to_check, exact_match=True)

        if len(search_results) > 1:
            return {
                "plagiarized": True,
                "summary": "Description found on other websites.",
                "found_urls": [result.get('link') for result in search_results]
            }
        return {"plagiarized": False, "summary": "No description duplicates found."}

    return _run_cached_job(check_id, "description_plagiarism", inputs, task)

def job_reverse_image_search(check_id: str):
    """Performs reverse image search on a limited number of images."""
    with get_db() as db:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
    
    # LIMIT the number of images to control cost and time
    image_urls = check.input_data.get("image_urls", [])[:MAX_IMAGES_TO_ANALYZE]
    inputs = {"image_urls": image_urls}
    if not inputs["image_urls"]:
        return {"status": "No images provided, skipping."}

    def task(data):
        with concurrent.futures.ThreadPoolExecutor() as executor:
            results = list(executor.map(image_analysis.reverse_image_search, data["image_urls"]))
        return {"reverse_search_results": results}

    return _run_cached_job(check_id, "reverse_image_search", inputs, task)


def job_ai_image_detection(check_id: str):
    """Checks for AI artifacts on images not already flagged as reused."""
    with get_db() as db:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
    
    initial_urls = check.input_data.get("image_urls", [])[:MAX_IMAGES_TO_ANALYZE]
    if not initial_urls:
        return {"status": "No images to process."}

    # FIX: Correctly regenerate the cache key for the dependency job
    reverse_search_inputs = {"image_urls": initial_urls}
    reverse_search_cache_key = generate_cache_key({
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
def job_text_analysis(check_id: str):
    """Analyzes description and communication text in parallel."""
    with get_db() as db:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
    inputs = {
        "description": check.input_data.get("description"),
        "communication_text": check.input_data.get("communication_text"),
    }

    def task(data):
        results = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = {}
            if data.get("description"):
                futures[executor.submit(gemini_analysis.analyze_description, data["description"])] = "description"
            if data.get("communication_text"):
                futures[executor.submit(gemini_analysis.analyze_communication, data["communication_text"])] = "communication"
            
            for future in concurrent.futures.as_completed(futures):
                analysis_type = futures[future]
                results[analysis_type] = future.result()
        return results
    
    return _run_cached_job(check_id, "text_analysis", inputs, task)

def job_listing_reviews_analysis(check_id: str):
    """Analyzes a limited number of the listing's own reviews."""
    with get_db() as db:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
    
    # LIMIT the number of reviews to control cost
    reviews = check.input_data.get("reviews", [])[:MAX_REVIEWS_TO_ANALYZE]
    inputs = {"reviews": reviews}

    def task(data):
        if not data["reviews"]:
            return {"status": "No listing reviews to analyze."}
        return gemini_analysis.analyze_listing_reviews(data["reviews"])

    return _run_cached_job(check_id, "listing_reviews_analysis", inputs, task)

def job_price_and_host_check(check_id: str):
    """Performs price sanity and host profile analysis in parallel."""
    with get_db() as db:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
    inputs = {
        "price_details": check.input_data.get("price_details"),
        "property_type": check.input_data.get("property_type"),
        "address": check.input_data.get("address"),
        "host_profile": check.input_data.get("host_profile") # Assuming host data is structured
    }

    def task(data):
        results = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = {}
            if all([data.get("price_details"), data.get("property_type"), data.get("address")]):
                futures[executor.submit(gemini_analysis.check_price_sanity, data["price_details"], data["property_type"], data["address"])] = "price"
            if data.get("host_profile"):
                futures[executor.submit(gemini_analysis.analyze_host_profile, data["host_profile"])] = "host"
            
            for future in concurrent.futures.as_completed(futures):
                analysis_type = futures[future]
                results[analysis_type] = future.result()
        return results
    
    return _run_cached_job(check_id, "price_and_host_check", inputs, task)

def job_google_places_analysis(check_id: str):
    """Compares listing data against verified Google Places data."""
    with get_db() as db:
        check = db.query(FraudCheck).filter(FraudCheck.id == check_id).first()
    
    address = check.input_data.get("address")
    if not address:
        return {"status": "No address to perform Google Places analysis."}

    # FIX: Correctly regenerate the cache key for the dependency job
    geocode_inputs = {"address": address}
    geocode_cache_key = generate_cache_key({"job_name": "geocode", "inputs": geocode_inputs})
    cached_data = redis_conn.hget(f"cache:{check_id}", geocode_cache_key)
    google_places_data = json.loads(cached_data) if cached_data else {}

    if not google_places_data or google_places_data.get("error"):
        return {"status": "Skipping due to invalid geocode result."}

    inputs = {
        "listing_data": {
            "reviews": check.input_data.get("reviews", [])[:MAX_REVIEWS_TO_ANALYZE]
        },
        "google_places_data": {
            "reviews": google_places_data.get("reviews", [])
        }
    }

    def task(data):
        return gemini_analysis.check_data_consistency(data["listing_data"], data["google_places_data"])

    return _run_cached_job(check_id, "google_places_analysis", inputs, task)