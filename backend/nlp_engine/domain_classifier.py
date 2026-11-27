"""
Phase B — Domain Classification Module
=======================================
Zero-shot text domain classifier using a lightweight pretrained NLI model.

Model: cross-encoder/nli-MiniLM2-L6-H768 (HuggingFace)
  - ~80 MB on disk, CPU-friendly
  - Based on MiniLM + NLI fine-tuning — works well for zero-shot classification
  - Falls back to facebook/bart-large-mnli if unavailable (heavier but more accurate)

Usage:
    from nlp_engine.domain_classifier import classify_domain, classify_domains_batch

Returned schema per document:
    {
        "task": "domain_classification",
        "domain": "Defence and Military",
        "score": 0.87,
        "all_scores": {"Defence and Military": 0.87, "Politics and Governance": 0.05, ...},
        "method": "zero-shot",
        "below_threshold": False,
        "model": "cross-encoder/nli-MiniLM2-L6-H768"
    }
"""

from __future__ import annotations
import threading
from typing import Dict, List, Optional

# ---------------------------------------------------------------------------
# Default candidate domain labels
# ---------------------------------------------------------------------------
DEFAULT_DOMAINS: List[str] = [
    "Defence and Military",
    "Politics and Governance",
    "Economy and Finance",
    "International Relations",
    "Technology",
    "Cybersecurity",
    "Public Safety",
    "Health",
    "Environment",
    "General News",
]

# Default minimum confidence score to assign a domain label.
# Below this threshold the result domain is "UNKNOWN".
DEFAULT_THRESHOLD: float = 0.25

# ---------------------------------------------------------------------------
# Lazy model loader — loads once, then reused for all requests (thread-safe).
# ---------------------------------------------------------------------------
_classifier = None
_model_name: str = ""
_lock = threading.Lock()

_PREFERRED_MODELS = [
    "cross-encoder/nli-MiniLM2-L6-H768",   # ~80 MB, fastest CPU
    "typeform/distilbart-mnli-12-3",         # ~250 MB, decent accuracy
    "facebook/bart-large-mnli",              # ~1.6 GB, most accurate
]


def _load_model() -> tuple:
    """
    Lazy-load the zero-shot classification pipeline.
    Returns (pipeline, model_name). Thread-safe.
    """
    global _classifier, _model_name
    if _classifier is not None:
        return _classifier, _model_name

    with _lock:
        # Double-check after acquiring lock
        if _classifier is not None:
            return _classifier, _model_name

        from transformers import pipeline as hf_pipeline

        last_error = None
        for model in _PREFERRED_MODELS:
            try:
                print(f"[DomainClassifier] Loading model: {model}")
                clf = hf_pipeline(
                    "zero-shot-classification",
                    model=model,
                    device=-1,          # CPU only — no GPU required
                    # Silence the verbose tokenizer / model logs
                    framework="pt",
                )
                _classifier = clf
                _model_name = model
                print(f"[DomainClassifier] Model loaded successfully: {model}")
                return _classifier, _model_name
            except Exception as e:
                last_error = e
                print(f"[DomainClassifier] Could not load {model}: {e}")
                continue

        raise RuntimeError(
            f"[DomainClassifier] All model attempts failed. "
            f"Last error: {last_error}"
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

DEFAULT_HYPOTHESIS_TEMPLATE: str = "The subject domain of this document is {}."

def classify_domain(
    text: str,
    candidate_labels: Optional[List[str]] = None,
    threshold: float = DEFAULT_THRESHOLD,
    hypothesis_template: str = DEFAULT_HYPOTHESIS_TEMPLATE,
) -> Dict:
    """
    Classify a single text into one of the candidate domain labels.

    Args:
        text: The input document text.
        candidate_labels: Optional override for domain labels.
        threshold: Minimum top-score to assign a domain (else UNKNOWN).
        hypothesis_template: NLI hypothesis prompt template.

    Returns:
        dict with keys: task, domain, score, all_scores, method, below_threshold, model
    """
    if not text or not text.strip():
        return _empty_result(candidate_labels or DEFAULT_DOMAINS)

    labels = candidate_labels if candidate_labels else DEFAULT_DOMAINS
    clf, model_name = _load_model()

    result = clf(
        text[:1500],     # Truncate very long texts — NLI models have token limits
        candidate_labels=labels,
        hypothesis_template=hypothesis_template,
        multi_label=False,
    )

    # result["labels"] is sorted highest-score first
    domain_scores: Dict[str, float] = {
        label: round(float(score), 4)
        for label, score in zip(result["labels"], result["scores"])
    }

    top_domain = result["labels"][0]
    top_score = round(float(result["scores"][0]), 4)
    below_threshold = top_score < threshold

    return {
        "task": "domain_classification",
        "domain": "UNKNOWN" if below_threshold else top_domain,
        "score": top_score,
        "all_scores": domain_scores,
        "method": "zero-shot",
        "below_threshold": below_threshold,
        "model": model_name,
    }


def classify_domains_batch(
    texts: List[str],
    candidate_labels: Optional[List[str]] = None,
    threshold: float = DEFAULT_THRESHOLD,
) -> List[Dict]:
    """
    Classify a batch of texts. Runs sequentially on CPU.

    Args:
        texts: List of input document strings.
        candidate_labels: Optional override for domain labels.
        threshold: Minimum score threshold.

    Returns:
        List of classification result dicts, one per input text.
    """
    return [
        classify_domain(text, candidate_labels=candidate_labels, threshold=threshold)
        for text in texts
    ]


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _empty_result(labels: List[str]) -> Dict:
    """Return a safe empty result for blank / missing text."""
    return {
        "task": "domain_classification",
        "domain": "UNKNOWN",
        "score": 0.0,
        "all_scores": {label: 0.0 for label in labels},
        "method": "zero-shot",
        "below_threshold": True,
        "model": "none (empty input)",
    }
