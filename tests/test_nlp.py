"""
Tests for the NLP connector engine (no external models required).
All tests use lightweight/fallback paths that don't need transformers.
"""

import pytest


# ---------------------------------------------------------------------------
# Preprocessing tests
# ---------------------------------------------------------------------------

class TestCleaning:
    def test_clean_text_removes_urls(self):
        from nlp_engine.preprocessing.cleaning import clean_text
        text = "Check this out https://example.com and www.test.org too."
        result = clean_text(text)
        assert "https://" not in result
        assert "www.test.org" not in result

    def test_clean_text_removes_html(self):
        from nlp_engine.preprocessing.cleaning import clean_text
        text = "<p>Hello <b>world</b></p>"
        assert clean_text(text) == "Hello world"

    def test_clean_text_handles_none(self):
        from nlp_engine.preprocessing.cleaning import clean_text
        assert clean_text(None) == ""

    def test_clean_text_normalizes_whitespace(self):
        from nlp_engine.preprocessing.cleaning import clean_text
        text = "too   many     spaces"
        assert "  " not in clean_text(text)

    def test_extract_text_field_flat(self):
        from nlp_engine.preprocessing.cleaning import extract_text_field
        doc = {"title": "Hello world"}
        assert extract_text_field(doc, "title") == "Hello world"

    def test_extract_text_field_nested(self):
        from nlp_engine.preprocessing.cleaning import extract_text_field
        doc = {"raw_payload": {"title": "Nested title"}}
        assert extract_text_field(doc, "raw_payload.title") == "Nested title"

    def test_extract_text_field_missing(self):
        from nlp_engine.preprocessing.cleaning import extract_text_field
        assert extract_text_field({"a": 1}, "nonexistent") == ""

    def test_prepare_documents(self):
        from nlp_engine.preprocessing.cleaning import prepare_documents
        docs = [
            {"_id": "1", "title": "Breaking news <b>today</b>"},
            {"_id": "2", "title": "   "},
        ]
        result = prepare_documents(docs, "title")
        assert len(result) == 2
        assert result[0]["clean_text"] == "Breaking news today"
        assert result[0]["_id"] == "1"


class TestLanguageDetection:
    def test_detect_empty_string(self):
        from nlp_engine.preprocessing.language_detection import detect_language
        result = detect_language("")
        assert result["code"] == "unknown"

    def test_batch_detect_returns_correct_count(self):
        from nlp_engine.preprocessing.language_detection import batch_detect_language
        docs = [
            {"_id": "1", "clean_text": "This is an English sentence."},
            {"_id": "2", "clean_text": "Bonjour le monde."},
        ]
        results = batch_detect_language(docs)
        assert len(results) == 2
        assert all("language_code" in r for r in results)


class TestNormalization:
    def test_normalize_whitespace(self):
        from nlp_engine.preprocessing.normalization import normalize_whitespace
        assert normalize_whitespace("hello   world") == "hello world"

    def test_truncate_text(self):
        from nlp_engine.preprocessing.normalization import truncate_text
        text = "A" * 2000
        result = truncate_text(text, max_chars=100)
        assert len(result) <= 104  # allow for ellipsis

    def test_normalize_for_nlp(self):
        from nlp_engine.preprocessing.normalization import normalize_for_nlp
        text = "Hello   World  "
        result = normalize_for_nlp(text, lowercase=True)
        assert result == "hello world"


# ---------------------------------------------------------------------------
# Keyword extraction (TF-IDF fallback — no models needed)
# ---------------------------------------------------------------------------

class TestKeywords:
    def test_keywords_returns_results(self):
        from nlp_engine.tasks.keywords import run_keywords
        docs = [
            {"_id": "1", "clean_text": "Artificial intelligence and machine learning are transforming technology."},
            {"_id": "2", "clean_text": "Climate change poses significant environmental challenges worldwide."},
        ]
        results = run_keywords(docs, top_n=5)
        assert len(results) == 2
        for r in results:
            assert "keywords" in r
            assert "method" in r
            assert r["task"] == "keywords"

    def test_keywords_empty_text(self):
        from nlp_engine.tasks.keywords import run_keywords
        docs = [{"_id": "1", "clean_text": ""}]
        results = run_keywords(docs)
        assert results[0]["keywords"] == []


# ---------------------------------------------------------------------------
# Deduplication (no models needed)
# ---------------------------------------------------------------------------

class TestDeduplication:
    def test_exact_duplicates(self):
        from nlp_engine.tasks.deduplication import run_deduplication
        docs = [
            {"_id": "1", "clean_text": "The quick brown fox jumps over the lazy dog."},
            {"_id": "2", "clean_text": "The quick brown fox jumps over the lazy dog."},
            {"_id": "3", "clean_text": "Something completely different."},
        ]
        result = run_deduplication(docs)
        assert result["task"] == "deduplication"
        assert result["total_docs"] == 3
        assert len(result["exact_duplicate_groups"]) == 1
        assert result["duplicate_count"] >= 1

    def test_empty_collection(self):
        from nlp_engine.tasks.deduplication import run_deduplication
        result = run_deduplication([])
        assert result["total_docs"] == 0

    def test_no_duplicates(self):
        from nlp_engine.tasks.deduplication import run_deduplication
        docs = [
            {"_id": "1", "clean_text": "First unique document about space."},
            {"_id": "2", "clean_text": "Second unique article about cooking."},
            {"_id": "3", "clean_text": "Third unique piece about sports."},
        ]
        result = run_deduplication(docs)
        assert result["exact_duplicate_groups"] == []


# ---------------------------------------------------------------------------
# Registry tests
# ---------------------------------------------------------------------------

class TestRegistry:
    def test_list_tasks_returns_all(self):
        from nlp_engine.registry import list_tasks, TASK_REGISTRY
        tasks = list_tasks()
        assert len(tasks) == len(TASK_REGISTRY)

    def test_all_tasks_have_required_keys(self):
        from nlp_engine.registry import list_tasks
        for task in list_tasks():
            assert "id" in task
            assert "name" in task
            assert "description" in task
            assert "output_type" in task

    def test_get_task_info(self):
        from nlp_engine.registry import get_task_info
        info = get_task_info("sentiment")
        assert info is not None
        assert info["name"] == "Sentiment Analysis"
        assert "runner" not in info  # runner should be excluded

    def test_unknown_task_returns_none(self):
        from nlp_engine.registry import get_task_info
        assert get_task_info("nonexistent_task") is None


# ---------------------------------------------------------------------------
# Validator tests
# ---------------------------------------------------------------------------

class TestValidator:
    def test_valid_request(self):
        from nlp_engine.workflow.validator import validate_nlp_request
        data = {
            "connection_id": "abc123",
            "database": "Events",
            "collection": "news_events",
            "text_field": "title",
            "task": "keywords",
            "limit": 50,
        }
        cleaned, error = validate_nlp_request(data)
        assert error is None
        assert cleaned["task"] == "keywords"
        assert cleaned["limit"] == 50

    def test_missing_required_field(self):
        from nlp_engine.workflow.validator import validate_nlp_request
        data = {
            "connection_id": "abc123",
            "database": "Events",
            # Missing collection, text_field, task
        }
        _, error = validate_nlp_request(data)
        assert error is not None

    def test_invalid_task(self):
        from nlp_engine.workflow.validator import validate_nlp_request
        data = {
            "connection_id": "abc",
            "database": "db",
            "collection": "col",
            "text_field": "title",
            "task": "invalid_task_name",
        }
        _, error = validate_nlp_request(data)
        assert error is not None
        assert "Unknown task" in error

    def test_limit_out_of_range(self):
        from nlp_engine.workflow.validator import validate_nlp_request
        data = {
            "connection_id": "abc",
            "database": "db",
            "collection": "col",
            "text_field": "title",
            "task": "sentiment",
            "limit": 9999,
        }
        _, error = validate_nlp_request(data)
        assert error is not None


# ---------------------------------------------------------------------------
# NLP API endpoint tests (Django TestClient)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestNlpApiEndpoints:
    def test_task_list_endpoint(self, client):
        resp = client.get("/api/nlp/tasks/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["count"] > 0
        assert len(data["tasks"]) > 0

    def test_capabilities_endpoint(self, client):
        resp = client.get("/api/nlp/capabilities/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "libraries" in data
        assert "tasks" in data

    def test_run_endpoint_missing_body(self, client):
        resp = client.post("/api/nlp/run/", content_type="application/json", data={})
        # Should fail validation
        assert resp.status_code in (400, 500)

    def test_run_endpoint_invalid_task(self, client):
        import json
        payload = {
            "connection_id": "fake",
            "database": "db",
            "collection": "col",
            "text_field": "title",
            "task": "bogus_task",
        }
        resp = client.post(
            "/api/nlp/run/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 400
        data = resp.json()
        assert data["success"] is False

    def test_run_endpoint_no_connection(self, client):
        import json
        payload = {
            "connection_id": "nonexistent_connection_id",
            "database": "Events",
            "collection": "news_events",
            "text_field": "title",
            "task": "keywords",
            "limit": 5,
        }
        resp = client.post(
            "/api/nlp/run/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        # Should return 500 with an error message (connection not found)
        data = resp.json()
        assert data["success"] is False
        assert "error" in data
