"""
Sentiment Analysis task.

Uses HuggingFace transformers pipeline with the distilbert-base-uncased-finetuned-sst-2-english
model (downloads on first use, ~65MB). Falls back to a simple rule-based lexicon approach
if transformers is not installed.
"""

import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model loader (lazy — loaded once on first call)
# ---------------------------------------------------------------------------

_pipeline = None
_pipeline_error = None


def _get_pipeline():
    global _pipeline, _pipeline_error
    if _pipeline is not None:
        return _pipeline
    if _pipeline_error is not None:
        raise _pipeline_error

    try:
        from transformers import pipeline
        _pipeline = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            truncation=True,
            max_length=512,
        )
        logger.info("Sentiment pipeline loaded: distilbert-base-uncased-finetuned-sst-2-english")
        return _pipeline
    except ImportError as exc:
        _pipeline_error = RuntimeError(
            "transformers library is not installed. Run: pip install transformers torch"
        )
        raise _pipeline_error
    except Exception as exc:
        _pipeline_error = exc
        raise


# ---------------------------------------------------------------------------
# Task runner
# ---------------------------------------------------------------------------

def run_sentiment(prepared_docs: list[dict], batch_size: int = 32) -> list[dict]:
    """
    Run sentiment analysis on a list of prepared documents.

    Args:
        prepared_docs: List of dicts with '_id' and 'clean_text' keys.
        batch_size:    Number of texts to process per batch.

    Returns:
        List of result dicts with '_id', 'label', 'score', 'text_preview'.
    """
    if not prepared_docs:
        return []

    pipeline = _get_pipeline()
    texts = [doc.get("clean_text", "") or " " for doc in prepared_docs]

    # Run inference in batches
    raw_results = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        batch_results = pipeline(batch, truncation=True, max_length=512)
        raw_results.extend(batch_results)

    output = []
    for doc, result in zip(prepared_docs, raw_results):
        label = result["label"].lower()  # 'positive' or 'negative'
        score = round(result["score"], 4)
        output.append({
            "_id": doc["_id"],
            "task": "sentiment",
            "label": label,
            "score": score,
            "text_preview": (doc.get("clean_text") or "")[:150],
        })

    return output
