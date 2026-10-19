
import json

from bson import json_util
from django.http import JsonResponse
from django.views.decorators.http import require_GET
import re
from django.shortcuts import render

from database.mongodb import (
    list_databases,
    list_collections,
    get_collection,
)
def dashboard(request):
    return render(request, "dashboard.html")


@require_GET
def dataset_list(request):
    try:
        datasets = []

        for database_name in list_databases():
            if database_name in ["admin", "local", "config"]:
                continue

            for collection_name in list_collections(database_name):
                datasets.append({
                    "database": database_name,
                    "collection": collection_name,
                })

        return JsonResponse({
            "success": True,
            "count": len(datasets),
            "datasets": datasets,
        })

    except Exception:
        return JsonResponse({
            "success": False,
            "error": "Unable to retrieve datasets from MongoDB.",
        }, status=500)


@require_GET
def collection_preview(request, database_name, collection_name):
    try:
        if database_name not in list_databases():
            return JsonResponse({
                "success": False,
                "error": "Database not found.",
            }, status=404)

        if collection_name not in list_collections(database_name):
            return JsonResponse({
                "success": False,
                "error": "Collection not found.",
            }, status=404)

        collection = get_collection(database_name, collection_name)

        try:
            limit = int(request.GET.get("limit", 10))
        except (TypeError, ValueError):
            return JsonResponse({
                "success": False,
                "error": "Limit must be an integer.",
            }, status=400)

        if not 1 <= limit <= 50:
            return JsonResponse({
                "success": False,
                "error": "Limit must be between 1 and 50.",
            }, status=400)

        total_records = collection.count_documents({})
        documents = list(collection.find({}).limit(limit))
        preview = json.loads(json_util.dumps(documents))

        fields = sorted({
            key
            for document in documents
            for key in document.keys()
        })

        return JsonResponse({
            "success": True,
            "database": database_name,
            "collection": collection_name,
            "total_records": total_records,
            "returned_records": len(preview),
            "fields": fields,
            "preview": preview,
        })

    except Exception:
        return JsonResponse({
            "success": False,
            "error": "Unable to retrieve collection data.",
        }, status=500)


@require_GET
def filter_collection(request, database_name, collection_name):
    try:
        if database_name not in list_databases():
            return JsonResponse({
                "success": False,
                "error": "Database not found.",
            }, status=404)

        if collection_name not in list_collections(database_name):
            return JsonResponse({
                "success": False,
                "error": "Collection not found.",
            }, status=404)

        collection = get_collection(database_name, collection_name)

        source = request.GET.get("source", "").strip()
        language = request.GET.get("language", "").strip()
        keyword = request.GET.get("keyword", "").strip()

        try:
            limit = int(request.GET.get("limit", 10))
        except (TypeError, ValueError):
            return JsonResponse({
                "success": False,
                "error": "Limit must be an integer.",
            }, status=400)

        if not 1 <= limit <= 100:
            return JsonResponse({
                "success": False,
                "error": "Limit must be between 1 and 100.",
            }, status=400)

        query = {}

        if source:
            query["source_name"] = {
                "$regex": source,
                "$options": "i",
            }

        if language:
            query["lang"] = {
                "$regex": f"^{language}$",
                "$options": "i",
            }

        if keyword:
            query["$or"] = [
                {"title": {"$regex": keyword, "$options": "i"}},
                {"summary": {"$regex": keyword, "$options": "i"}},
                {"raw_payload.title": {
                    "$regex": keyword, "$options": "i"
                }},
                {"raw_payload.summary": {
                    "$regex": keyword, "$options": "i"
                }},
            ]

        total_matching = collection.count_documents(query)
        documents = list(collection.find(query).limit(limit))
        preview = json.loads(json_util.dumps(documents))

        return JsonResponse({
            "success": True,
            "database": database_name,
            "collection": collection_name,
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

    except Exception:
        return JsonResponse({
            "success": False,
            "error": "Unable to filter collection data.",
        }, status=500)


@require_GET
def sample_collection(request, database_name, collection_name):
    try:
        # 1. Validate the database and collection.
        if database_name not in list_databases():
            return JsonResponse({
                "success": False,
                "error": "Database not found.",
            }, status=404)

        if collection_name not in list_collections(database_name):
            return JsonResponse({
                "success": False,
                "error": "Collection not found.",
            }, status=404)

        collection = get_collection(database_name, collection_name)

        # 2. Read and validate request parameters.
        language = request.GET.get("language", "").strip()
        keyword = request.GET.get("keyword", "").strip()

        try:
            sample_size = int(request.GET.get("size", 100))
        except (TypeError, ValueError):
            return JsonResponse({
                "success": False,
                "error": "Size must be an integer.",
            }, status=400)

        if not 1 <= sample_size <= 1000:
            return JsonResponse({
                "success": False,
                "error": "Size must be between 1 and 1000.",
            }, status=400)

        # 3. Build the filter.
        query = {}

        if language:
            query["lang"] = {
                "$regex": f"^{re.escape(language)}$",
                "$options": "i",
            }

        if keyword:
            safe_keyword = re.escape(keyword)
            query["$or"] = [
                {"title": {"$regex": safe_keyword, "$options": "i"}},
                {"summary": {"$regex": safe_keyword, "$options": "i"}},
                {"raw_payload.title": {
                    "$regex": safe_keyword, "$options": "i"
                }},
                {"raw_payload.summary": {
                    "$regex": safe_keyword, "$options": "i"
                }},
            ]

        # 4. Count qualifying documents.
        total_matching = collection.count_documents(query)

        # 5. Randomly sample up to the requested number.
        actual_size = min(sample_size, total_matching)

        if actual_size:
            documents = list(collection.aggregate([
                {"$match": query},
                {"$sample": {"size": actual_size}},
            ]))
        else:
            documents = []

        preview = json.loads(json_util.dumps(documents))

        return JsonResponse({
            "success": True,
            "database": database_name,
            "collection": collection_name,
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

    except Exception:
        return JsonResponse({
            "success": False,
            "error": "Unable to sample collection data.",
        }, status=500)
