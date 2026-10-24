"""NLP result validators — checks for malformed or low-quality outputs."""


def validate_sentiment_results(results: list[dict]) -> list[str]:
    """Return a list of warning messages for problematic sentiment results."""
    warnings = []
    for r in results:
        if r.get("label") not in ("positive", "negative"):
            warnings.append(f"Doc {r['_id']}: unexpected label '{r.get('label')}'")
        score = r.get("score", 0)
        if not 0.0 <= score <= 1.0:
            warnings.append(f"Doc {r['_id']}: score out of range ({score})")
    return warnings


def validate_ner_results(results: list[dict]) -> list[str]:
    """Return warnings for NER results."""
    warnings = []
    for r in results:
        if not isinstance(r.get("entities"), dict):
            warnings.append(f"Doc {r['_id']}: 'entities' should be a dict.")
    return warnings


def filter_empty_results(results: list[dict]) -> list[dict]:
    """Remove results where text was empty or task produced no output."""
    return [r for r in results if r.get("text_preview") or r.get("keywords") or r.get("summary")]
