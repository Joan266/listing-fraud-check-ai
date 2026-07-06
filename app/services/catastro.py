"""
Spanish Catastro (Land Registry) lookup service.
Uses the public OVC (Oficina Virtual del Catastro) REST API.
Only works for Spanish properties (country_code == "es").
"""

import logging
import requests
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

OVC_BASE_URL = "http://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC"
TIMEOUT = 10


def lookup_by_coordinates(lat: float, lng: float) -> dict:
    """
    Looks up Catastro data using coordinates.
    Returns property reference and details if found.
    """
    try:
        url = f"{OVC_BASE_URL}/OVCCoordenadas.asmx/Consulta_RCCOOR"
        params = {"SRS": "EPSG:4326", "Coordenada_X": lng, "Coordenada_Y": lat}
        response = requests.get(url, params=params, timeout=TIMEOUT)
        response.raise_for_status()
        return _parse_catastro_response(response.text)
    except Exception as e:
        logger.error(f"Catastro coordinate lookup failed: {e}")
        return {"found": False, "error": str(e)}


def lookup_by_address(province: str, municipality: str, street: str, number: str) -> dict:
    """
    Looks up Catastro data using a structured address.
    """
    try:
        url = f"{OVC_BASE_URL}/OVCCallejero.asmx/Consulta_DNPLOC"
        params = {
            "Provincia": province,
            "Municipio": municipality,
            "Sigla": "",
            "Calle": street,
            "Numero": number,
            "Bloque": "",
            "Escalera": "",
            "Planta": "",
            "Puerta": "",
        }
        response = requests.get(url, params=params, timeout=TIMEOUT)
        response.raise_for_status()
        return _parse_catastro_response(response.text)
    except Exception as e:
        logger.error(f"Catastro address lookup failed: {e}")
        return {"found": False, "error": str(e)}


def _parse_catastro_response(xml_text: str) -> dict:
    """Parses XML response from the Catastro OVC API."""
    try:
        # Remove namespace for easier parsing
        xml_text = xml_text.replace(' xmlns="http://www.catastro.meh.es/"', "")
        root = ET.fromstring(xml_text)

        # Check for errors
        error_elem = root.find(".//err")
        if error_elem is not None:
            error_msg = error_elem.find("des")
            return {
                "found": False,
                "error": error_msg.text if error_msg is not None else "Unknown Catastro error",
            }

        # Extract cadastral reference
        rc_elem = root.find(".//rc")
        if rc_elem is None:
            return {"found": False, "reason": "No cadastral reference found."}

        pc1 = rc_elem.findtext("pc1", "")
        pc2 = rc_elem.findtext("pc2", "")
        cadastral_ref = f"{pc1}{pc2}"

        # Extract address details
        address_elem = root.find(".//ldt")
        address_text = address_elem.text if address_elem is not None else None

        # Extract use (residential, commercial, etc.)
        use_elem = root.find(".//luso")
        use_text = use_elem.text if use_elem is not None else None

        return {
            "found": True,
            "cadastral_reference": cadastral_ref,
            "registered_address": address_text,
            "registered_use": use_text,
        }
    except ET.ParseError as e:
        logger.error(f"Failed to parse Catastro XML: {e}")
        return {"found": False, "error": f"XML parse error: {e}"}
