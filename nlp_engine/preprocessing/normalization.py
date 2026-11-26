"""Text normalization utilities."""

import re
import string


def normalize_whitespace(text: str) -> str:
    """Collapse multiple whitespace characters into a single space."""
    return re.sub(r"\s+", " ", text).strip()


def to_lowercase(text: str) -> str:
    return text.lower()


def remove_punctuation(text: str) -> str:
    """Remove punctuation characters from text."""
    return text.translate(str.maketrans("", "", string.punctuation))


def truncate_text(text: str, max_chars: int = 1024) -> str:
    """Truncate text to a maximum character length, breaking at word boundary."""
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    last_space = truncated.rfind(" ")
    if last_space > max_chars // 2:
        truncated = truncated[:last_space]
    return truncated + "…"


def normalize_for_nlp(text: str, lowercase: bool = False, max_chars: int = 2048) -> str:
    """
    Standard normalization pipeline for NLP input:
    - Normalize whitespace
    - Optionally lowercase
    - Truncate to max_chars
    """
    text = normalize_whitespace(text)
    if lowercase:
        text = to_lowercase(text)
    text = truncate_text(text, max_chars)
    return text
