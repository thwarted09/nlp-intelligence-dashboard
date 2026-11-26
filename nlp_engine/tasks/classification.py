"""
Text Classification task.

Uses HuggingFace zero-shot classification pipeline with
facebook/bart-large-mnli (downloads on first use, ~1.6GB).
Falls back to keyword-based rule classification if model unavailable.
"""

import logging
import re

logger = logging.getLogger(__name__)

_pipeline = None
_pipeline_error = None

_DEFAULT_MODEL = "facebook/bart-large-mnli"


def _get_pipeline():
    global _pipeline, _pipeline_error
    if _pipeline is not None:
        return _pipeline
    if _pipeline_error is not None:
        return None

    try:
        from transformers import pipeline
        _pipeline = pipeline(
            "zero-shot-classification",
            model=_DEFAULT_MODEL,
            truncation=True,
        )
        logger.info(f"Classification pipeline loaded: {_DEFAULT_MODEL}")
        return _pipeline
    except ImportError:
        _pipeline_error = "transformers not installed"
        logger.warning("transformers not available, using rule-based fallback.")
        return None
    except Exception as exc:
        _pipeline_error = str(exc)
        logger.warning(f"Classification model failed: {exc}. Using rule-based fallback.")
        return None


# ---------------------------------------------------------------------------
# Rule-based fallback classifier
# ---------------------------------------------------------------------------

_TOPIC_KEYWORDS = {
    "politics": ["government", "election", "president", "parliament", "minister", "policy", "vote", "senator"],
    "technology": ["ai", "software", "hardware", "internet", "cyber", "digital", "algorithm", "robot", "drone"],
    "sports": ["football", "cricket", "tennis", "basketball", "match", "tournament", "player", "team", "goal"],
    "business": ["market", "stock", "economy", "finance", "trade", "company", "revenue", "profit", "startup"],
    "health": ["hospital", "disease", "vaccine", "medicine", "doctor", "health", "virus", "pandemic", "treatment"],
    "military": ["army", "military", "weapon", "war", "battle", "attack", "missile", "defense", "soldier"],
    "environment": ["climate", "weather", "pollution", "carbon", "energy", "emission", "forest", "ocean"],
    "science": ["research", "study", "discovery", "experiment", "quantum", "space", "nasa", "biology", "chemistry"],
}


def _rule_classify(text: str, candidate_labels: list[str]) -> dict:
    text_lower = text.lower()
    scores = {}
    for label in candidate_labels:
        keywords = _TOPIC_KEYWORDS.get(label.lower(), [label.lower()])
        count = sum(1 for kw in keywords if kw in text_lower)
        scores[label] = count / max(len(keywords), 1)
    total = sum(scores.values()) or 1
    normalized = {k: round(v / total, 4) for k, v in scores.items()}
    top_label = max(normalized, key=normalized.get)
    return {
        "top_label": top_label,
        "scores": dict(sorted(normalized.items(), key=lambda x: x[1], reverse=True)),
    }


def run_classification(
    prepared_docs: list[dict],
    candidate_labels: list[str] | None = None,
    batch_size: int = 8,
) -> list[dict]:
    """
    Classify each document into one of the candidate_labels.

    Args:
        prepared_docs:    List of dicts with '_id' and 'clean_text'.
        candidate_labels: Labels to classify into. Defaults to a general news taxonomy.
        batch_size:       Documents per batch for model inference.

    Returns:
        List of dicts with '_id', 'top_label', 'scores', 'method'.
    """
    if candidate_labels is None:
        candidate_labels = [
            "politics", "technology", "sports", "business",
            "health", "military", "environment", "science",
        ]

    if not prepared_docs:
        return []

    pipe = _get_pipeline()
    output = []

    for doc in prepared_docs:
        text = (doc.get("clean_text") or "").strip()
        doc_id = doc["_id"]

        if not text:
            output.append({
                "_id": doc_id,
                "task": "classification",
                "top_label": "unknown",
                "scores": {},
                "method": "none",
                "text_preview": "",
            })
            continue

        if pipe is not None:
            try:
                result = pipe(text[:1024], candidate_labels=candidate_labels, truncation=True)
                scores = dict(zip(result["labels"], [round(s, 4) for s in result["scores"]]))
                top_label = result["labels"][0]
                method = "zero-shot"
            except Exception as exc:
                logger.warning(f"Zero-shot classification failed on {doc_id}: {exc}")
                cls = _rule_classify(text, candidate_labels)
                top_label = cls["top_label"]
                scores = cls["scores"]
                method = "rule_fallback"
        else:
            cls = _rule_classify(text, candidate_labels)
            top_label = cls["top_label"]
            scores = cls["scores"]
            method = "rule"

        output.append({
            "_id": doc_id,
            "task": "classification",
            "top_label": top_label,
            "scores": scores,
            "method": method,
            "text_preview": text[:150],
        })

    return output
