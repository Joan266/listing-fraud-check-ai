"""
UK HM Land Registry lookup service.
Uses the public SPARQL endpoint at landregistry.data.gov.uk.
Only works for UK properties (country_code == "gb").
"""

import logging
import re
import requests

logger = logging.getLogger(__name__)

SPARQL_ENDPOINT = "https://landregistry.data.gov.uk/landregistry/query"
TIMEOUT = 15


def lookup_by_postcode(postcode: str) -> dict:
    """
    Queries HM Land Registry Price Paid Data for a given UK postcode.
    Returns recent transaction history to verify the property exists.
    """
    if not postcode:
        return {"found": False, "reason": "No postcode provided."}

    clean_postcode = _normalize_postcode(postcode)
    if not clean_postcode:
        return {"found": False, "reason": f"Invalid UK postcode format: {postcode}"}

    query = _build_sparql_query(clean_postcode)

    try:
        response = requests.get(
            SPARQL_ENDPOINT,
            params={"query": query, "output": "json"},
            headers={"Accept": "application/sparql-results+json"},
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        return _parse_sparql_response(response.json())
    except Exception as e:
        logger.error(f"UK Land Registry lookup failed: {e}")
        return {"found": False, "error": str(e)}


def _normalize_postcode(postcode: str) -> str:
    """Validates and normalizes a UK postcode (e.g. 'e1 6an' -> 'E1 6AN')."""
    cleaned = re.sub(r"[^A-Za-z0-9]", "", postcode).upper()
    # UK postcodes: outward (2-4 chars) + inward (3 chars)
    if len(cleaned) < 5 or len(cleaned) > 7:
        return ""
    inward = cleaned[-3:]
    outward = cleaned[:-3]
    return f"{outward} {inward}"


def _build_sparql_query(postcode: str) -> str:
    """Builds a SPARQL query for Price Paid Data by postcode."""
    return f"""
PREFIX ppd: <http://landregistry.data.gov.uk/def/ppi/>
PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>

SELECT ?amount ?date ?propertyType ?address
WHERE {{
  ?txn ppd:pricePaid ?amount ;
       ppd:transactionDate ?date ;
       ppd:propertyAddress ?addr ;
       ppd:propertyType ?propertyType .
  ?addr lrcommon:postcode "{postcode}" .
  OPTIONAL {{ ?addr lrcommon:paon ?paon . }}
  OPTIONAL {{ ?addr lrcommon:street ?street . }}
  BIND(CONCAT(COALESCE(?paon, ""), " ", COALESCE(?street, "")) AS ?address)
}}
ORDER BY DESC(?date)
LIMIT 10
"""


def _parse_sparql_response(data: dict) -> dict:
    """Parses SPARQL JSON results into a structured response."""
    bindings = data.get("results", {}).get("bindings", [])
    if not bindings:
        return {"found": False, "reason": "No price paid records found for this postcode."}

    transactions = []
    for b in bindings:
        transactions.append({
            "amount": int(float(b["amount"]["value"])),
            "date": b["date"]["value"],
            "property_type": b["propertyType"]["value"].rsplit("/", 1)[-1],
            "address": b.get("address", {}).get("value", "").strip(),
        })

    latest = transactions[0]
    return {
        "found": True,
        "transactions": transactions,
        "latest_price": latest["amount"],
        "latest_date": latest["date"],
        "property_type": latest["property_type"],
    }
