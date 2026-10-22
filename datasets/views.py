import json
import logging
import re

from bson import json_util
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt

from database.mongodb import (
    check_mongodb_connection,
    connect_mongodb,
    disconnect_mongodb,
    get_collection,
    get_collection_stats,
    list_collections,
    list_databases,
)

logger = logging.getLogger(__name__)

SYSTEM_DATABASES = {"admin", "local", "config"}


# --------------------------------------------------------------------------
# Helpers (shared by views)
# --------------------------------------------------------------------------

def _error(message, status=400):
    """Standard JSON error response."""
    return JsonResponse({"success": False, "error": message}, status=status)


def _validate_target(database_name, collection_name, connection_id=None):
    """Return an error response if the DB or collection does not exist, else None."""
    try:
        available_dbs = list_databases(connection_id)
        if available_dbs and database_name not in available_dbs:
            return _error(f"Database '{database_name}' not found.", 404)

        available_cols = list_collections(database_name, connection_id)
        if available_cols and collection_name not in available_cols:
            return _error(
                f"Collection '{collection_name}' not found in database '{database_name}'.",
                404,
            )
    except Exception as exc:
        return _error(f"Unable to access database: {exc}", 400)

    return None


def _parse_int(request, param, default, minimum, maximum):
    """
    Read an integer query parameter and validate its range.
    Returns (value, None) on success or (None, error_response) on failure.
    """
    raw = request.GET.get(param, default)

    try:
        value = int(raw)
    except (TypeError, ValueError):
        return None, _error(f"{param.capitalize()} must be an integer.", 400)

    if not minimum <= value <= maximum:
        return None, _error(
            f"{param.capitalize()} must be between {minimum} and {maximum}.",
            400,
        )

    return value, None


def _keyword_filter(keyword):
    """Case-insensitive search across title, summary, text, content and raw_payload fields."""
    pattern = re.escape(keyword)
    fields = [
        "title",
        "summary",
        "text",
        "content",
        "headline",
        "description",
        "raw_payload.title",
        "raw_payload.summary",
        "raw_payload.text",
        "raw_payload.message",
    ]
    return [{field: {"$regex": pattern, "$options": "i"}} for field in fields]


def _to_json_safe(documents):
    """Convert MongoDB documents (ObjectId, datetime, etc.) into JSON-serializable structures."""
    return json.loads(json_util.dumps(documents))


# --------------------------------------------------------------------------
# Views
# --------------------------------------------------------------------------

def dashboard(request):
    """Render the unified NLP intelligence workspace."""
    return render(request, "dashboard.html")


@require_GET
def connection_status(request):
    """Check connectivity to MongoDB (default or dynamic connection)."""
    connection_id = request.GET.get("connection_id") or None
    result = check_mongodb_connection(connection_id)
    status_code = 200 if result["connected"] else 503

    return JsonResponse({
        "success": result["connected"],
        "connected": result["connected"],
        "message": result["message"],
        "connection_id": connection_id,
    }, status=status_code)


@require_GET
def dataset_list(request):
    """List all available datasets (databases and collections) for the active connection."""
    try:
        connection_id = request.GET.get("connection_id") or None
        datasets = []
        databases = list_databases(connection_id)

        for database_name in databases:
            if database_name in SYSTEM_DATABASES:
                continue

            for collection_name in list_collections(database_name, connection_id):
                datasets.append({
                    "database": database_name,
                    "collection": collection_name,
                })

        return JsonResponse({
            "success": True,
            "count": len(datasets),
            "connection_id": connection_id,
            "databases": [db for db in databases if db not in SYSTEM_DATABASES],
            "datasets": datasets,
        })

    except ValueError as exc:
        return _error(str(exc), 400)
    except Exception as exc:
        logger.exception("dataset_list failed")
        return _error("Unable to retrieve datasets from MongoDB.", 500)


@csrf_exempt
@require_POST
def connect_database(request):
    """
    Connect to a MongoDB cluster using a connection URI link.
    Supports direct database/collection selection from the link or request payload.
    """
    try:
        data = json.loads(request.body)

        if not isinstance(data, dict):
            return _error("Request body must be a JSON object.", 400)

        uri = data.get("uri")
        if not isinstance(uri, str) or not uri.strip():
            return _error("A valid MongoDB URI is required.", 400)

        result = connect_mongodb(uri.strip())

        # If user explicitly specified db or col in request, override/supplement
        requested_db = data.get("database") or result.get("default_database")
        requested_col = data.get("collection") or result.get("default_collection")

        return JsonResponse({
            "success": True,
            "connection_id": result["connection_id"],
            "connected": True,
            "masked_uri": result["masked_uri"],
            "databases": result["databases"],
            "default_database": requested_db,
            "default_collection": requested_col,
            "message": "Successfully connected to MongoDB cluster.",
        })

    except json.JSONDecodeError:
        return _error("Invalid JSON request body.", 400)
    except ValueError as exc:
        return _error(str(exc), 400)
    except Exception as exc:
        # Do not log the raw URI to keep passwords safe
        logger.exception("connect_database failed")
        return _error(
            "Unable to connect to MongoDB. Check the URI credentials, network access, or cluster whitelist.",
            400,
        )


@csrf_exempt
@require_POST
def disconnect_database(request):
    """Disconnect and clean up a dynamic connection client."""
    try:
        data = json.loads(request.body)
        connection_id = data.get("connection_id")

        if not connection_id:
            return _error("Connection ID is required.", 400)

        disconnected = disconnect_mongodb(connection_id)
        return JsonResponse({
            "success": True,
            "disconnected": disconnected,
            "message": "Dynamic connection closed.",
        })
    except Exception as exc:
        return _error(str(exc), 400)


@require_GET
def collection_schema(request, database_name, collection_name):
    """Retrieve metadata, document count, and discovered fields for a collection."""
    try:
        connection_id = request.GET.get("connection_id") or None
        error = _validate_target(database_name, collection_name, connection_id)
        if error:
            return error

        stats = get_collection_stats(database_name, collection_name, connection_id)
        return JsonResponse({
            "success": True,
            **stats,
        })
    except Exception as exc:
        logger.exception("collection_schema failed")
        return _error(f"Unable to retrieve collection schema: {exc}", 500)


@require_GET
def collection_preview(request, database_name, collection_name):
    """Return an exploratory preview of records from the selected collection."""
    try:
        connection_id = request.GET.get("connection_id") or None
        error = _validate_target(database_name, collection_name, connection_id)
        if error:
            return error

        limit, error = _parse_int(request, "limit", 10, 1, 100)
        if error:
            return error

        collection = get_collection(database_name, collection_name, connection_id)

        total_records = collection.count_documents({})
        documents = list(collection.find({}).limit(limit))
        preview = _to_json_safe(documents)

        fields = sorted({key for document in documents for key in document})

        return JsonResponse({
            "success": True,
            "database": database_name,
            "collection": collection_name,
            "connection_id": connection_id,
            "total_records": total_records,
            "returned_records": len(preview),
            "fields": fields,
            "preview": preview,
        })

    except Exception as exc:
        logger.exception("collection_preview failed")
        return _error(f"Unable to retrieve collection data: {exc}", 500)


@require_GET
def filter_collection(request, database_name, collection_name):
    """Search and filter records inside the selected collection."""
    try:
        connection_id = request.GET.get("connection_id") or None
        error = _validate_target(database_name, collection_name, connection_id)
        if error:
            return error

        limit, error = _parse_int(request, "limit", 10, 1, 100)
        if error:
            return error

        source = request.GET.get("source", "").strip()
        language = request.GET.get("language", "").strip()
        keyword = request.GET.get("keyword", "").strip()

        query = {}

        if source:
            query["source_name"] = {
                "$regex": re.escape(source),
                "$options": "i",
            }

        if language:
            query["lang"] = {
                "$regex": f"^{re.escape(language)}$",
                "$options": "i",
            }

        if keyword:
            query["$or"] = _keyword_filter(keyword)

        collection = get_collection(database_name, collection_name, connection_id)

        total_matching = collection.count_documents(query)
        documents = list(collection.find(query).limit(limit))
        preview = _to_json_safe(documents)

        return JsonResponse({
            "success": True,
            "database": database_name,
            "collection": collection_name,
            "connection_id": connection_id,
            "filters": {
                "source": source,
                "language": language,
                "keyword": keyword,
            },
            "total_matching": total_matching,
            "returned_records": len(preview),
            "limit": limit,
            "preview": preview,
        })

    except Exception as exc:
        logger.exception("filter_collection failed")
        return _error(f"Unable to filter collection data: {exc}", 500)


@require_GET
def sample_collection(request, database_name, collection_name):
    """Extract a representative random sample of documents for testing and NLP analysis."""
    try:
        connection_id = request.GET.get("connection_id") or None
        error = _validate_target(database_name, collection_name, connection_id)
        if error:
            return error

        sample_size, error = _parse_int(request, "size", 100, 1, 1000)
        if error:
            return error

        language = request.GET.get("language", "").strip()
        keyword = request.GET.get("keyword", "").strip()

        query = {}

        if language:
            query["lang"] = {
                "$regex": f"^{re.escape(language)}$",
                "$options": "i",
            }

        if keyword:
            query["$or"] = _keyword_filter(keyword)

        collection = get_collection(database_name, collection_name, connection_id)

        total_matching = collection.count_documents(query)
        actual_size = min(sample_size, total_matching)

        if actual_size > 0:
            pipeline = []
            if query:
                pipeline.append({"$match": query})
            pipeline.append({"$sample": {"size": actual_size}})
            documents = list(collection.aggregate(pipeline))
        else:
            documents = []

        preview = _to_json_safe(documents)

        return JsonResponse({
            "success": True,
            "database": database_name,
            "collection": collection_name,
            "connection_id": connection_id,
            "filters": {
                "language": language or None,
                "keyword": keyword or None,
            },
            "total_matching": total_matching,
            "requested_sample_size": sample_size,
            "returned_records": len(preview),
            "sampling_method": "random",
            "preview": preview,
        })

    except Exception as exc:
        logger.exception("sample_collection failed")
        return _error(f"Unable to sample collection data: {exc}", 500)