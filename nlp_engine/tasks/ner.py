"""
Named Entity Recognition (NER) task.

Uses HuggingFace transformers pipeline with dslim/bert-base-NER model
(downloads on first use, ~400MB). Entities are grouped and deduped per document.
"""

import logging

logger = logging.getLogger(__name__)

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
            "ner",
            model="dslim/bert-base-NER",
            aggregation_strategy="simple",
            truncation=True,
            max_length=512,
        )
        logger.info("NER pipeline loaded: dslim/bert-base-NER")
        return _pipeline
    except ImportError:
        _pipeline_error = RuntimeError(
            "transformers library is not installed. Run: pip install transformers torch"
        )
        raise _pipeline_error
    except Exception as exc:
        _pipeline_error = exc
        raise


def run_ner(prepared_docs: list[dict], batch_size: int = 16) -> list[dict]:
    """
    Run Named Entity Recognition on a list of prepared documents.

    Args:
        prepared_docs: List of dicts with '_id' and 'clean_text' keys.
        batch_size:    Number of texts to process per batch.

    Returns:
        List of result dicts with '_id', 'entities' (grouped by type), 'entity_count'.
    """
    if not prepared_docs:
        return []

    pipeline = _get_pipeline()
    texts = [doc.get("clean_text", "") or " " for doc in prepared_docs]

    raw_results = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        batch_results = pipeline(batch, truncation=True, max_length=512)
        raw_results.extend(batch_results)

    output = []
    for doc, entities in zip(prepared_docs, raw_results):
        # Group entities by their type
        grouped: dict[str, list[str]] = {}
        for ent in entities:
            entity_group = ent.get("entity_group", ent.get("entity", "UNKNOWN"))
            word = ent.get("word", "").strip()
            if not word:
                continue
            grouped.setdefault(entity_group, [])
            if word not in grouped[entity_group]:
                grouped[entity_group].append(word)

        entity_count = sum(len(v) for v in grouped.values())
        output.append({
            "_id": doc["_id"],
            "task": "ner",
            "entities": grouped,
            "entity_count": entity_count,
            "text_preview": (doc.get("clean_text") or "")[:150],
        })

    return output
