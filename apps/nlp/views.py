"""
NLP Connector API Views.

All endpoints are synchronous (no Celery). Results are returned directly
in the HTTP response. Documents are fetched from MongoDB via connection_id.
"""

import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from nlp_engine.registry import list_tasks, TASK_REGISTRY
from nlp_engine.schemas import NLPJobRequest
from nlp_engine.workflow.executor import execute_nlp_job
from nlp_engine.workflow.validator import validate_nlp_request

logger = logging.getLogger(__name__)


def _error(message: str, status: int = 400) -> JsonResponse:
    return JsonResponse({"success": False, "error": message}, status=status)


# ---------------------------------------------------------------------------
# GET /api/nlp/tasks/
# ---------------------------------------------------------------------------

@require_GET
def task_list(request):
    """List all available NLP tasks with their metadata and options."""
    return JsonResponse({
        "success": True,
        "count": len(TASK_REGISTRY),
        "tasks": list_tasks(),
    })


# ---------------------------------------------------------------------------
# POST /api/nlp/run/
# ---------------------------------------------------------------------------

@csrf_exempt
@require_POST
def run_task(request):
    """
    Run an NLP task on a MongoDB collection.

    Expected JSON body:
    {
        "connection_id": "<id from /api/datasets/connect/>",
        "database":      "<db_name>",
        "collection":    "<collection_name>",
        "text_field":    "<field_to_extract_text_from>",
        "task":          "<sentiment|ner|keywords|summarization|classification|deduplication|language_detection>",
        "limit":         100,          // optional, max 1000
        "options":       {}            // optional task-specific overrides
    }
    """
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return _error("Invalid JSON request body.", 400)

    cleaned, error = validate_nlp_request(data)
    if error:
        return _error(error, 400)

    job = NLPJobRequest(
        connection_id=cleaned["connection_id"],
        database=cleaned["database"],
        collection=cleaned["collection"],
        text_field=cleaned["text_field"],
        task=cleaned["task"],
        limit=cleaned["limit"],
        options=cleaned["options"],
    )

    logger.info(
        f"NLP job: task={job.task} db={job.database}.{job.collection} "
        f"field={job.text_field} limit={job.limit}"
    )

    result = execute_nlp_job(job)

    if result.error:
        return JsonResponse({
            "success": False,
            "error": result.error,
            **result.to_dict(),
        }, status=500)

    return JsonResponse({
        "success": True,
        **result.to_dict(),
    })


# ---------------------------------------------------------------------------
# GET /api/nlp/capabilities/
# ---------------------------------------------------------------------------

@require_GET
def capabilities(request):
    """
    Check which NLP capabilities are available based on installed libraries.
    Returns library availability for each task type.
    """
    caps = {}

    try:
        import transformers
        caps["transformers"] = transformers.__version__
    except ImportError:
        caps["transformers"] = None

    try:
        import torch
        caps["torch"] = torch.__version__
    except ImportError:
        caps["torch"] = None

    try:
        import keybert
        caps["keybert"] = "available"
    except ImportError:
        caps["keybert"] = None

    try:
        import langdetect
        caps["langdetect"] = "available"
    except ImportError:
        caps["langdetect"] = None

    try:
        import sklearn
        caps["scikit-learn"] = sklearn.__version__
    except ImportError:
        caps["scikit-learn"] = None

    transformers_ok = caps["transformers"] is not None and caps["torch"] is not None

    task_availability = {}
    for task_id, info in TASK_REGISTRY.items():
        if info["requires_transformers"]:
            task_availability[task_id] = {
                "available": transformers_ok,
                "fallback": True,
                "note": "Falls back to rule-based if transformers unavailable.",
            }
        else:
            task_availability[task_id] = {
                "available": True,
                "fallback": False,
                "note": "Works without transformers.",
            }

    return JsonResponse({
        "success": True,
        "libraries": caps,
        "transformers_ready": transformers_ok,
        "tasks": task_availability,
    })
