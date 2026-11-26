"""
Text Summarization task.

Uses HuggingFace transformers pipeline with facebook/bart-large-cnn model
(downloads on first use, ~1.6GB) or facebook/bart-base (~550MB).
Falls back to extractive summarization if transformers is unavailable.
"""

import logging
import re

logger = logging.getLogger(__name__)

_pipeline = None
_pipeline_error = None

# Use the smaller model by default to keep download size reasonable
_DEFAULT_MODEL = "facebook/bart-large-cnn"


def _get_pipeline():
    global _pipeline, _pipeline_error
    if _pipeline is not None:
        return _pipeline
    if _pipeline_error is not None:
        return None  # Fallback mode

    try:
        from transformers import pipeline
        _pipeline = pipeline(
            "summarization",
            model=_DEFAULT_MODEL,
            truncation=True,
            max_length=1024,
        )
        logger.info(f"Summarization pipeline loaded: {_DEFAULT_MODEL}")
        return _pipeline
    except ImportError:
        _pipeline_error = "transformers not installed"
        logger.warning("transformers not available, using extractive fallback.")
        return None
    except Exception as exc:
        _pipeline_error = str(exc)
        logger.warning(f"Summarization model failed to load: {exc}. Using extractive fallback.")
        return None


# ---------------------------------------------------------------------------
# Extractive fallback: pick top N sentences by position/length
# ---------------------------------------------------------------------------

def _extractive_summary(text: str, max_sentences: int = 3) -> str:
    """Simple extractive summary: return first N meaningful sentences."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
    selected = sentences[:max_sentences]
    return " ".join(selected) if selected else text[:300]


def run_summarization(
    prepared_docs: list[dict],
    max_length: int = 150,
    min_length: int = 40,
) -> list[dict]:
    """
    Summarize each document's text.

    Args:
        prepared_docs: List of dicts with '_id' and 'clean_text'.
        max_length:    Maximum summary token length (abstractive).
        min_length:    Minimum summary token length (abstractive).

    Returns:
        List of dicts with '_id', 'summary', 'method', 'original_length'.
    """
    if not prepared_docs:
        return []

    pipe = _get_pipeline()
    output = []

    for doc in prepared_docs:
        text = (doc.get("clean_text") or "").strip()
        doc_id = doc["_id"]
        original_length = len(text)

        if not text or original_length < 50:
            output.append({
                "_id": doc_id,
                "task": "summarization",
                "summary": text,
                "method": "passthrough",
                "original_length": original_length,
                "summary_length": len(text),
            })
            continue

        if pipe is not None:
            try:
                # Truncate input to 1024 chars to avoid OOM on large docs
                truncated = text[:4096]
                result = pipe(
                    truncated,
                    max_length=max_length,
                    min_length=min_length,
                    do_sample=False,
                    truncation=True,
                )
                summary = result[0]["summary_text"]
                method = "bart"
            except Exception as exc:
                logger.warning(f"Abstractive summarization failed on doc {doc_id}: {exc}")
                summary = _extractive_summary(text)
                method = "extractive_fallback"
        else:
            summary = _extractive_summary(text)
            method = "extractive"

        output.append({
            "_id": doc_id,
            "task": "summarization",
            "summary": summary,
            "method": method,
            "original_length": original_length,
            "summary_length": len(summary),
        })

    return output
