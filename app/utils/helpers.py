# in app/utils/helpers.py
from pathlib import Path
import json
import hashlib
# Get the base directory of the 'app' package
APP_DIR = Path(__file__).parent.parent

def load_prompt(prompt_name: str) -> str:
    """Loads a prompt from the prompts directory."""
    prompt_path = APP_DIR / "prompts" / f"{prompt_name}.txt"
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        # Handle cases where the prompt file doesn't exist
        return ""
    

def generate_input_hash(data: dict) -> str:
    """
    Creates a predictable SHA-256 hash from a dictionary.

    This ensures that the same input data always produces the same hash,
    which is crucial for checking for duplicate analysis requests.
    """
    # Use sort_keys=True to ensure that dictionaries with the same content
    # but different key order produce the exact same JSON string.
    canonical_string = json.dumps(data, sort_keys=True)
    
    # Hash the string using SHA-256 to get a unique and fixed-length identifier.
    return hashlib.sha256(canonical_string.encode('utf-8')).hexdigest()