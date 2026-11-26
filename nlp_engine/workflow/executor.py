"""
NLP Workflow Executor.

Orchestrates the full pipeline:
  1. Fetch documents from MongoDB via connection_id
  2. Preprocess (extract + clean text field)
  3. Dispatch to the appropriate task runner
  4. Return structured NLPJobResult
"""

import json
import logging
from bson import json_util

from database.mongodb import get_collection
from nlp_engine.preprocessing.cleaning import prepare_documents
from nlp_engine.preprocessing.language_detection import batch_detect_language
from nlp_engine.tasks.deduplication import run_deduplication
from nlp_engine.registry import TASK_REGISTRY
from nlp_engine.schemas import NLPJobRequest, NLPJobResult

logger = logging.getLogger(__name__)

MAX_NLP_DOCUMENTS = 1000  # Hard cap to prevent OOM on large collections


def execute_nlp_job(job: NLPJobRequest) -> NLPJobResult:
    """
    Execute an NLP task on a MongoDB collection.

    Args:
        job: NLPJobRequest with connection details and task parameters.

    Returns:
        NLPJobResult with task outputs and metadata.
    """
    task_id = job.task
    task_info = TASK_REGISTRY.get(task_id)

    if not task_info:
        return NLPJobResult(
            task=task_id,
            collection=job.collection,
            database=job.database,
            text_field=job.text_field,
            total_documents=0,
            processed_documents=0,
            skipped_documents=0,
            output_type="none",
            error=f"Unknown task: '{task_id}'. Available: {list(TASK_REGISTRY.keys())}",
        )

    # 1. Fetch documents from MongoDB
    try:
        limit = min(job.limit, MAX_NLP_DOCUMENTS)
        collection = get_collection(job.database, job.collection, job.connection_id)
        raw_docs = list(collection.find({}).limit(limit))
        # Convert BSON to JSON-safe dicts
        docs = json.loads(json_util.dumps(raw_docs))
    except Exception as exc:
        logger.exception("Failed to fetch documents for NLP job")
        return NLPJobResult(
            task=task_id,
            collection=job.collection,
            database=job.database,
            text_field=job.text_field,
            total_documents=0,
            processed_documents=0,
            skipped_documents=0,
            output_type=task_info["output_type"],
            error=f"Failed to fetch documents: {exc}",
        )

    total_docs = len(docs)

    if total_docs == 0:
        return NLPJobResult(
            task=task_id,
            collection=job.collection,
            database=job.database,
            text_field=job.text_field,
            total_documents=0,
            processed_documents=0,
            skipped_documents=0,
            output_type=task_info["output_type"],
            results=[],
        )

    # 2. Preprocess — extract and clean the target text field
    prepared = prepare_documents(docs, job.text_field)
    non_empty = [d for d in prepared if d.get("clean_text", "").strip()]
    skipped = total_docs - len(non_empty)

    # 3. Dispatch to task runner
    try:
        results = _dispatch(task_id, task_info, non_empty, job.options)
    except Exception as exc:
        logger.exception(f"NLP task '{task_id}' failed")
        return NLPJobResult(
            task=task_id,
            collection=job.collection,
            database=job.database,
            text_field=job.text_field,
            total_documents=total_docs,
            processed_documents=0,
            skipped_documents=skipped,
            output_type=task_info["output_type"],
            error=str(exc),
        )

    # Determine method from results
    method = _infer_method(results, task_id)

    return NLPJobResult(
        task=task_id,
        collection=job.collection,
        database=job.database,
        text_field=job.text_field,
        total_documents=total_docs,
        processed_documents=len(non_empty),
        skipped_documents=skipped,
        output_type=task_info["output_type"],
        results=results,
        method=method,
    )


def _dispatch(task_id: str, task_info: dict, prepared_docs: list[dict], options: dict):
    """Route to the correct task runner."""

    if task_id == "language_detection":
        return batch_detect_language(prepared_docs)

    if task_id == "deduplication":
        threshold = float(options.get("similarity_threshold", 0.85))
        return run_deduplication(prepared_docs, similarity_threshold=threshold)

    runner = task_info.get("runner")
    if runner is None:
        raise ValueError(f"No runner configured for task '{task_id}'")

    if task_id == "sentiment":
        return runner(prepared_docs, batch_size=int(options.get("batch_size", 32)))

    if task_id == "ner":
        return runner(prepared_docs, batch_size=int(options.get("batch_size", 16)))

    if task_id == "keywords":
        return runner(
            prepared_docs,
            top_n=int(options.get("top_n", 10)),
        )

    if task_id == "summarization":
        return runner(
            prepared_docs,
            max_length=int(options.get("max_length", 150)),
            min_length=int(options.get("min_length", 40)),
        )

    if task_id == "classification":
        labels_raw = options.get("candidate_labels")
        if isinstance(labels_raw, str):
            candidate_labels = [l.strip() for l in labels_raw.split(",") if l.strip()]
        elif isinstance(labels_raw, list):
            candidate_labels = labels_raw
        else:
            candidate_labels = None
        return runner(prepared_docs, candidate_labels=candidate_labels)

    # Generic fallback
    return runner(prepared_docs, **options)


def _infer_method(results, task_id: str) -> str:
    """Infer the method used from the first result."""
    if isinstance(results, dict):
        return results.get("method", task_id)
    if isinstance(results, list) and results:
        return results[0].get("method", task_id)
    return task_id
