import re
from app.utils.validators import sanitize_user_text


# Footer markers — everything after these is platform boilerplate
_FOOTER_MARKERS = (
    "copyright ©",
    "all rights reserved",
    "tots els drets reservats",
    "todos los derechos reservados",
    "booking holdings inc",
    "privacy policy",
    "política de privacidad",
    "política de privadesa",
    "terms of service",
    "condicions del servei",
    "condiciones del servicio",
    "© 2024",
    "© 2025",
    "© 2026",
)

# Lines that are pure UI noise (buttons, pagination, survey options)
_NOISE_EXACT = frozenset({
    "eur", "usd", "gbp", "chf",
    "question image",
    "neutral",
    "molt d'acord", "d'acord", "poc d'acord", "gens d'acord",
    "strongly agree", "agree", "disagree", "strongly disagree",
    "muy de acuerdo", "de acuerdo", "en desacuerdo",
})

_NOISE_PATTERNS = [
    re.compile(r"^\d+\s*fotos?\s*(més|more|más)?\s*$", re.IGNORECASE),
    re.compile(
        r"^(mostra|show|mostrar|ver)\s+(la\s+)?"
        r"(disponibilitat|availability|disponibilidad)",
        re.IGNORECASE,
    ),
    re.compile(r"^(reserva|book)\s+(ara|now|ahora)\s*$", re.IGNORECASE),
    re.compile(
        r"^(llegeix|read|lee|leer)\s+(tots?|all|todos)\s+"
        r"(els?\s+)?(comentaris|reviews|comentarios)",
        re.IGNORECASE,
    ),
    re.compile(r"^\d+\s*de\s*\d+\s*$"),  # "1 de 2" pagination
    re.compile(r"^(desa|save|guardar)\s+(com a|as)\s+", re.IGNORECASE),
    re.compile(r"^(fes una pregunta|ask a question|haz una pregunta)\s*$", re.IGNORECASE),
]

# Sections near the bottom of the page — skip everything after
_SKIP_TO_END = (
    "preguntes freqüents",
    "frequently asked questions",
    "preguntas frecuentes",
    "el millor de",
    "the best of",
    "lo mejor de",
    "clica aquí per veure",
    "click here to see",
    "haz clic aquí para ver",
)

# Mid-page noise sections — skip until real content resumes
_SKIP_UNTIL_CONTENT = (
    "com ho estem fent",
    "how are we doing",
    "què vol saber la gent",
    "what do people want to know",
    "qué quiere saber la gente",
    "treu més partit",
    "get more out of",
    "saca más partido",
)


def _is_noise(line: str) -> bool:
    lower = line.lower().strip()
    if lower in _NOISE_EXACT:
        return True
    return any(p.match(line) for p in _NOISE_PATTERNS)


def sanitize_listing_text(raw_text: str, max_chars: int = 50000) -> str:
    """
    Sanitizes and optimizes raw pasted listing text for AI extraction.

    1. Security: strips control chars, null bytes, HTML tags
    2. Noise removal: UI buttons, survey options, repeated CTAs
    3. Deduplication: removes repeated lines
    4. Footer truncation: cuts at copyright/TOS markers
    5. Section skipping: removes FAQ, link dumps, platform promos
    6. Caps output length
    """
    if not raw_text:
        return ""

    # Security sanitization first
    text = sanitize_user_text(raw_text)

    # Strip any leftover HTML tags
    text = re.sub(r"<[^>]+>", " ", text)

    lines = text.splitlines()

    # --- Phase 1: Filter noise lines and global dedup ---
    seen: set[str] = set()
    cleaned: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if len(stripped) <= 2 and not stripped[0].isdigit():
            continue
        if stripped in seen:
            continue
        seen.add(stripped)
        if _is_noise(stripped):
            continue
        cleaned.append(stripped)

    # --- Phase 2: Truncate at footer markers ---
    result: list[str] = []
    for line in cleaned:
        lower = line.lower()
        if any(m in lower for m in _FOOTER_MARKERS):
            break
        result.append(line)

    # --- Phase 3: Skip irrelevant sections ---
    filtered: list[str] = []
    skip_to_end = False
    skip_until_content = False
    for line in result:
        lower = line.lower()

        # Bottom-of-page junk: skip everything after
        if any(lower.startswith(s) for s in _SKIP_TO_END):
            skip_to_end = True
            continue
        if skip_to_end:
            continue

        # Mid-page noise: skip questions/short lines until real content
        if any(lower.startswith(s) for s in _SKIP_UNTIL_CONTENT):
            skip_until_content = True
            continue
        if skip_until_content:
            if line.endswith("?") or len(line) <= 40:
                continue
            skip_until_content = False

        filtered.append(line)

    output = "\n".join(filtered)
    return output[:max_chars]
