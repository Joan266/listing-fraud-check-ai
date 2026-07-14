"""
Structured risk scoring engine.
Each analysis job produces a risk_score (0-100) and confidence (0.0-1.0).
The finalizer aggregates weighted scores and applies compound rules.
"""

# Weights for each job (must sum to ~1.0 for normalization)
WEIGHTS: dict[str, float] = {
    "reverse_image_search": 0.20,
    "iban_country_check": 0.15,
    "communication_analysis": 0.13,
    "price_sanity_check": 0.12,
    "url_forensics": 0.10,
    "description_analysis": 0.10,
    "description_plagiarism_check": 0.10,
    "reputation_check": 0.08,
    "address_cross_platform_search": 0.07,
    "host_profile_check": 0.05,
}

# Compound rules: combinations of signals that amplify risk
COMPOUND_RULES: list[dict] = [
    {
        "name": "stolen_images_plus_new_host",
        "conditions": ["reverse_image_search", "host_profile_check"],
        "description": "Stolen images combined with a new/unverified host account",
        "bonus_score": 15,
    },
    {
        "name": "low_price_plus_pressure",
        "conditions": ["price_sanity_check", "communication_analysis"],
        "description": "Suspiciously low price combined with pressure tactics in communication",
        "bonus_score": 12,
    },
    {
        "name": "new_domain_plus_plagiarism",
        "conditions": ["url_forensics", "description_plagiarism_check"],
        "description": "New domain with plagiarized listing description",
        "bonus_score": 10,
    },
    {
        "name": "stolen_images_plus_low_price",
        "conditions": ["reverse_image_search", "price_sanity_check"],
        "description": "Stolen images combined with suspiciously low price — classic scam pattern",
        "bonus_score": 18,
    },
    {
        "name": "iban_mismatch_plus_low_price",
        "conditions": ["iban_country_check", "price_sanity_check"],
        "description": "Foreign IBAN combined with suspiciously low price — classic advance-fee scam",
        "bonus_score": 20,
    },
    {
        "name": "iban_mismatch_plus_pressure",
        "conditions": ["iban_country_check", "communication_analysis"],
        "description": "Foreign IBAN combined with pressure tactics in communication",
        "bonus_score": 15,
    },
    {
        "name": "verified_safe",
        "conditions": ["host_profile_check", "reputation_check"],
        "description": "Verified host with clean reputation history",
        "bonus_score": -15,
    },
]

# Thresholds for considering a job's score as "high risk" or "low risk"
HIGH_RISK_THRESHOLD = 60
LOW_RISK_THRESHOLD = 20


def calculate_job_risk_score(job_name: str, result: dict, status: str) -> dict:
    """
    Calculates risk_score and confidence for a single job based on its result.
    Returns dict with risk_score (0-100) and confidence (0.0-1.0).
    """
    if status == "SKIPPED":
        return {"risk_score": 0, "confidence": 0.0}
    if status == "ERROR":
        return {"risk_score": 0, "confidence": 0.0}

    score = 0
    confidence = 0.7  # default confidence for completed jobs

    if job_name == "reverse_image_search":
        items = result.get("reverse_search_results", [])
        reused_count = sum(1 for item in items if isinstance(item, dict) and item.get("is_reused"))
        if reused_count > 0:
            score = min(40 + reused_count * 20, 100)
            confidence = 0.9
        else:
            score = 0
            confidence = 0.8

    elif job_name == "url_forensics":
        domain_age = result.get("domain_age", {})
        blacklist = result.get("blacklist_check", {})
        if blacklist.get("is_blacklisted"):
            score = 95
            confidence = 0.95
        elif domain_age.get("is_new"):
            score = 55
            confidence = 0.8
        else:
            score = 0
            confidence = 0.7

    elif job_name == "description_analysis":
        themes = result.get("themes", [])
        sentiment = result.get("sentiment", "Neutral")
        if sentiment == "Negative":
            score = 30 + len(themes) * 15
        elif themes:
            score = len(themes) * 12
        score = min(score, 85)
        confidence = 0.7

    elif job_name == "communication_analysis":
        themes = result.get("themes", [])
        sentiment = result.get("sentiment", "Neutral")
        high_risk_themes = {"Risky Payment Request", "High-Pressure Tactics", "Phishing Attempt"}
        critical = sum(1 for t in themes if t in high_risk_themes)
        if critical > 0:
            score = min(50 + critical * 20, 100)
            confidence = 0.85
        elif themes:
            score = len(themes) * 15
            confidence = 0.7
        else:
            score = 0
            confidence = 0.7

    elif job_name == "price_sanity_check":
        verdict = result.get("verdict", "Reasonable")
        if verdict == "Suspiciously Low":
            score = 70
            confidence = 0.75
        elif verdict == "High":
            score = 20
            confidence = 0.6
        elif verdict == "Not Evaluable":
            score = 0
            confidence = 0.0  # excluded from weighted average
        else:
            score = 0
            confidence = 0.8

    elif job_name == "description_plagiarism_check":
        if result.get("plagiarized"):
            found_urls = result.get("found_urls", [])
            score = min(40 + len(found_urls) * 10, 80)
            confidence = 0.8
        else:
            score = 0
            confidence = 0.7

    elif job_name == "reputation_check":
        search_text = result.get("search_results_text", "")
        if search_text:
            score = 50
            confidence = 0.6
        else:
            score = 0
            confidence = 0.5

    elif job_name == "host_profile_check":
        themes = result.get("themes", [])
        score = len(themes) * 25
        score = min(score, 70)
        confidence = 0.7

    elif job_name == "iban_country_check":
        if result.get("is_suspicious"):
            score = 85
            confidence = 0.9
        elif result.get("ibans_found", 0) > 0:
            score = 0
            confidence = 0.9  # IBAN found and matches country — positive signal
        else:
            score = 0
            confidence = 0.0  # No IBAN found, can't assess

    elif job_name == "address_cross_platform_search":
        verdict = result.get("verdict", "not_evaluable")
        if verdict == "suspicious":
            score = 65
            confidence = 0.7
        elif verdict == "legitimate":
            score = 0
            confidence = 0.7
        else:
            score = 0
            confidence = 0.0  # not_evaluable — excluded from weighted average

    return {"risk_score": min(score, 100), "confidence": round(confidence, 2)}


def compute_outcome(step: dict) -> str:
    """Returns outcome label for frontend rendering."""
    status = step.get("status")
    if status == "SKIPPED":
        return "skipped"
    if status == "ERROR":
        return "failed"
    result = step.get("result", {})
    job_name = step.get("job_name", "")
    if job_name == "price_sanity_check" and result.get("verdict") == "Not Evaluable":
        return "not_evaluable"
    risk = step.get("risk_score", 0)
    if risk >= 60:
        return "risk_high"
    if risk >= 30:
        return "risk_medium"
    if risk > 0:
        return "risk_low"
    return "no_risk"


def calculate_weighted_score(job_scores: dict[str, dict]) -> dict:
    """
    Calculates the final weighted risk score from all job scores.
    Applies compound rules for signal amplification.
    Returns dict with calculated_risk_score, high_risk_signals, and compound_rules_triggered.
    """
    total_weighted = 0.0
    total_weight = 0.0
    high_risk_signals = []
    low_risk_signals = []

    for job_name, score_data in job_scores.items():
        weight = WEIGHTS.get(job_name, 0.05)
        risk_score = score_data.get("risk_score", 0)
        confidence = score_data.get("confidence", 0.0)

        if confidence > 0:
            effective_weight = weight * confidence
            total_weighted += risk_score * effective_weight
            total_weight += effective_weight

            if risk_score >= HIGH_RISK_THRESHOLD:
                high_risk_signals.append(job_name)
            if risk_score <= LOW_RISK_THRESHOLD:
                low_risk_signals.append(job_name)

    base_score = int(total_weighted / total_weight) if total_weight > 0 else 50

    # Apply compound rules
    compound_bonus = 0
    triggered_rules = []
    for rule in COMPOUND_RULES:
        if rule["bonus_score"] < 0:
            # Negative bonus rules trigger when all conditions have LOW risk
            conditions_met = all(
                job_name in low_risk_signals for job_name in rule["conditions"]
            )
        else:
            conditions_met = all(
                job_name in high_risk_signals for job_name in rule["conditions"]
            )
        if conditions_met:
            compound_bonus += rule["bonus_score"]
            triggered_rules.append(rule["name"])

    final_score = max(0, min(base_score + compound_bonus, 100))

    return {
        "calculated_risk_score": final_score,
        "high_risk_signals": high_risk_signals,
        "compound_rules_triggered": triggered_rules,
    }
