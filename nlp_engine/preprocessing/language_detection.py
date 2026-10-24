"""Language detection preprocessing module."""

try:
    from langdetect import detect, detect_langs, LangDetectException
    LANGDETECT_AVAILABLE = True
except ImportError:
    LANGDETECT_AVAILABLE = False


# ISO 639-1 language code → human-readable name mapping
LANGUAGE_NAMES = {
    "en": "English", "ar": "Arabic", "fr": "French", "de": "German",
    "es": "Spanish", "zh-cn": "Chinese (Simplified)", "zh-tw": "Chinese (Traditional)",
    "ru": "Russian", "ja": "Japanese", "ko": "Korean", "pt": "Portuguese",
    "it": "Italian", "nl": "Dutch", "pl": "Polish", "tr": "Turkish",
    "hi": "Hindi", "fa": "Persian", "uk": "Ukrainian", "sv": "Swedish",
    "da": "Danish", "fi": "Finnish", "no": "Norwegian", "cs": "Czech",
    "ro": "Romanian", "hu": "Hungarian", "id": "Indonesian", "ms": "Malay",
    "th": "Thai", "vi": "Vietnamese",
}


def detect_language(text: str) -> dict:
    """
    Detect the language of a text string.
    Returns a dict with 'code', 'name', and 'confidence'.
    Falls back to 'unknown' if detection fails or library is unavailable.
    """
    if not text or not text.strip():
        return {"code": "unknown", "name": "Unknown", "confidence": 0.0}

    if not LANGDETECT_AVAILABLE:
        return {"code": "unknown", "name": "Unknown (langdetect not installed)", "confidence": 0.0}

    try:
        code = detect(text)
        langs = detect_langs(text)
        confidence = round(langs[0].prob, 4) if langs else 0.0
        name = LANGUAGE_NAMES.get(code, code.upper())
        return {"code": code, "name": name, "confidence": confidence}
    except LangDetectException:
        return {"code": "unknown", "name": "Unknown", "confidence": 0.0}
    except Exception:
        return {"code": "unknown", "name": "Unknown", "confidence": 0.0}


def batch_detect_language(prepared_docs: list[dict]) -> list[dict]:
    """
    Run language detection on a list of prepared documents.
    Each doc should have '_id' and 'clean_text' keys.
    Returns list of result dicts per document.
    """
    results = []
    for doc in prepared_docs:
        lang = detect_language(doc.get("clean_text", ""))
        results.append({
            "_id": doc["_id"],
            "text_preview": doc.get("clean_text", "")[:120],
            "language_code": lang["code"],
            "language_name": lang["name"],
            "confidence": lang["confidence"],
        })
    return results
