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
# Helpers
# --------------------------------------------------------------------------

def _error(message, status=400):
    """Standard JSON error response."""
    return JsonResponse({"success": False, "error": message}, status=status)


def _get_connection_id(request):
    """Extract connection_id from query parameters or headers."""
    cid = request.GET.get("connection_id") or request.headers.get("X-Connection-ID")
    if cid and isinstance(cid, str):
        cid = cid.strip()
        return cid if cid else None
    return None


def _validate_target(database_name, collection_name, connection_id):
    """Validate that the connection, database, and collection exist."""
    if not connection_id:
        return _error("Please connect via a MongoDB URL link first.", 400)

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
    except ValueError as exc:
        return _error(str(exc), 400)
    except Exception as exc:
        return _error(f"Unable to access database: {exc}", 400)

    return None


def _parse_int(request, param, default, minimum, maximum):
    """Read an integer query parameter and validate its range."""
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
    """Case-insensitive search across common text and payload fields."""
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
    """Convert MongoDB BSON documents into JSON-serializable structures."""
    return json.loads(json_util.dumps(documents))


# --------------------------------------------------------------------------
# Views
# --------------------------------------------------------------------------

def dashboard(request):
    """Render the MongoDB Link Connector & Exploration workspace."""
    return render(request, "dashboard.html")


@require_GET
def connection_status(request):
    """Check connectivity for an active MongoDB connection."""
    connection_id = _get_connection_id(request)
    if not connection_id:
        return JsonResponse({
            "success": True,
            "connected": False,
            "message": "No active connection. Connect using a MongoDB URL link.",
            "connection_id": None,
        })

    result = check_mongodb_connection(connection_id)
    status_code = 200 if result["connected"] else 400

    return JsonResponse({
        "success": result["connected"],
        "connected": result["connected"],
        "message": result["message"],
        "connection_id": connection_id,
    }, status=status_code)


@require_GET
def dataset_list(request):
    """List databases and collections for the active MongoDB connection."""
    connection_id = _get_connection_id(request)
    if not connection_id:
        return JsonResponse({
            "success": True,
            "connected": False,
            "count": 0,
            "connection_id": None,
            "databases": [],
            "datasets": [],
            "message": "No active connection. Connect using a MongoDB URL link.",
        })

    try:
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
            "connected": True,
            "count": len(datasets),
            "connection_id": connection_id,
            "databases": [db for db in databases if db not in SYSTEM_DATABASES],
            "datasets": datasets,
        })

    except ValueError as exc:
        return _error(str(exc), 400)
    except Exception as exc:
        logger.exception("dataset_list failed")
        return _error("Unable to retrieve collections from MongoDB.", 500)


@csrf_exempt
@require_POST
def connect_database(request):
    """
    Connect to MongoDB solely via a provided connection URL link.
    Supports auto-extracting database and collection from the link.
    """
    try:
        data = json.loads(request.body)

        if not isinstance(data, dict):
            return _error("Request body must be a JSON object.", 400)

        uri = data.get("uri")
        if not isinstance(uri, str) or not uri.strip():
            return _error("A valid MongoDB connection URL link is required.", 400)

        result = connect_mongodb(uri.strip())

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
            "message": "Connected to MongoDB via link.",
        })

    except json.JSONDecodeError:
        return _error("Invalid JSON request body.", 400)
    except ValueError as exc:
        return _error(str(exc), 400)
    except Exception as exc:
        logger.exception("connect_database failed")
        return _error(
            "Unable to connect to MongoDB with provided URL. Check connection string, credentials, or network permissions.",
            400,
        )


@csrf_exempt
@require_POST
def disconnect_database(request):
    """Disconnect and clean up an active MongoDB connection."""
    try:
        data = json.loads(request.body)
        connection_id = data.get("connection_id")

        if not connection_id:
            return _error("Connection ID is required.", 400)

        disconnected = disconnect_mongodb(connection_id)
        return JsonResponse({
            "success": True,
            "disconnected": disconnected,
            "message": "MongoDB connection closed.",
        })
    except Exception as exc:
        return _error(str(exc), 400)


@require_GET
def collection_schema(request, database_name, collection_name):
    """Retrieve document count and detected fields for a collection."""
    connection_id = _get_connection_id(request)
    error = _validate_target(database_name, collection_name, connection_id)
    if error:
        return error

    try:
        stats = get_collection_stats(database_name, collection_name, connection_id)
        return JsonResponse({
            "success": True,
            **stats,
        })
    except Exception as exc:
        logger.exception("collection_schema failed")
        return _error(f"Unable to retrieve schema: {exc}", 500)


@require_GET
def collection_preview(request, database_name, collection_name):
    """Preview records from a collection on the active connection."""
    connection_id = _get_connection_id(request)
    error = _validate_target(database_name, collection_name, connection_id)
    if error:
        return error

    limit, error = _parse_int(request, "limit", 10, 1, 100)
    if error:
        return error

    try:
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
    """Filter records within a collection on the active connection."""
    connection_id = _get_connection_id(request)
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
        query["source_name"] = {"$regex": re.escape(source), "$options": "i"}
    if language:
        query["lang"] = {"$regex": f"^{re.escape(language)}$", "$options": "i"}
    if keyword:
        query["$or"] = _keyword_filter(keyword)

    try:
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
    """Extract a random document sample from a collection on the active connection."""
    connection_id = _get_connection_id(request)
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
        query["lang"] = {"$regex": f"^{re.escape(language)}$", "$options": "i"}
    if keyword:
        query["$or"] = _keyword_filter(keyword)

    try:
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