"""NLP validator — input validation for NLP job requests."""

from nlp_engine.registry import TASK_REGISTRY

MAX_NLP_DOCS = 1000


def validate_nlp_request(data: dict) -> tuple[dict | None, str | None]:
    """
    Validate an incoming NLP job request payload.

    Returns:
        (cleaned_data, error_message) — error_message is None if valid.
    """
    if not isinstance(data, dict):
        return None, "Request body must be a JSON object."

    # Required fields
    required = ["connection_id", "database", "collection", "text_field", "task"]
    for field in required:
        if not data.get(field) or not isinstance(data[field], str):
            return None, f"'{field}' is required and must be a non-empty string."

    task = data["task"].strip().lower()
    if task not in TASK_REGISTRY:
        return None, (
            f"Unknown task '{task}'. Available tasks: {', '.join(TASK_REGISTRY.keys())}."
        )

    # Optional limit
    limit_raw = data.get("limit", 100)
    try:
        limit = int(limit_raw)
    except (TypeError, ValueError):
        return None, "'limit' must be an integer."

    if not 1 <= limit <= MAX_NLP_DOCS:
        return None, f"'limit' must be between 1 and {MAX_NLP_DOCS}."

    options = data.get("options", {})
    if not isinstance(options, dict):
        return None, "'options' must be a JSON object."

    return {
        "connection_id": data["connection_id"].strip(),
        "database": data["database"].strip(),
        "collection": data["collection"].strip(),
        "text_field": data["text_field"].strip(),
        "task": task,
        "limit": limit,
        "options": options,
    }, None
