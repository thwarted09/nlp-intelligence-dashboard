"""Text cleaning utilities for NLP preprocessing."""

import re
import unicodedata


def clean_text(text: str) -> str:
    """
    Clean raw text for NLP processing.

    Steps:
    - Normalize unicode characters
    - Remove URLs
    - Remove HTML tags
    - Collapse excessive whitespace
    - Strip leading/trailing whitespace
    """
    if not isinstance(text, str):
        text = str(text) if text is not None else ""

    # Normalize unicode (NFKC: canonical decomposition then compatibility composition)
    text = unicodedata.normalize("NFKC", text)

    # Remove URLs
    text = re.sub(r"https?://\S+|www\.\S+", "", text)

    # Remove HTML tags
    text = re.sub(r"<[^>]+>", "", text)

    # Remove non-printable control characters (keep newlines and tabs)
    text = re.sub(r"[^\S\n\t ]+", " ", text)

    # Collapse multiple whitespace
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def extract_text_field(document: dict, field: str) -> str:
    """
    Extract text from a potentially nested field in a MongoDB document.
    Supports dot-notation: e.g., 'raw_payload.title'.
    """
    parts = field.split(".")
    value = document
    for part in parts:
        if isinstance(value, dict):
            value = value.get(part)
        else:
            value = None
            break

    if value is None:
        return ""

    if isinstance(value, list):
        # Join list elements into a single string
        return " ".join(str(item) for item in value if item)

    return str(value)


def prepare_documents(documents: list[dict], text_field: str) -> list[dict]:
    """
    For each document, extract and clean the target text field.
    Returns a list of dicts with '_id', 'raw_text', and 'clean_text'.
    """
    prepared = []
    for doc in documents:
        raw = extract_text_field(doc, text_field)
        cleaned = clean_text(raw)
        doc_id = str(doc.get("_id", ""))
        prepared.append({
            "_id": doc_id,
            "raw_text": raw,
            "clean_text": cleaned,
        })
    return prepared
