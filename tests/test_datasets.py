import json
import pytest
from django.test import Client
from database.mongodb import get_mongo_client


@pytest.fixture
def client():
    return Client()


def test_dashboard_page(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"NLP Intelligence Workspace" in response.content
    assert b"MongoDB Connection Link / URI" in response.content


def test_mongodb_connection_status(client):
    response = client.get("/api/datasets/status/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["connected"] is True


def test_dataset_list(client):
    response = client.get("/api/datasets/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "datasets" in data
    assert "databases" in data
    assert len(data["datasets"]) > 0


def test_collection_preview(client):
    # Tests preview on Events/news_events
    response = client.get("/api/datasets/Events/news_events/preview/?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["database"] == "Events"
    assert data["collection"] == "news_events"
    assert len(data["preview"]) <= 5
    assert "fields" in data


def test_collection_schema(client):
    response = client.get("/api/datasets/Events/news_events/schema/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "fields" in data
    assert "total_records" in data


def test_collection_filter(client):
    response = client.get("/api/datasets/Events/news_events/filter/?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "preview" in data


def test_collection_sample(client):
    response = client.get("/api/datasets/Events/news_events/sample/?size=3")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "preview" in data
    assert len(data["preview"]) <= 3


def test_connect_invalid_uri(client):
    response = client.post(
        "/api/datasets/connect/",
        data=json.dumps({"uri": "invalid_mongo_uri"}),
        content_type="application/json",
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False


def test_connect_and_disconnect_dynamic_client(client):
    import os
    valid_uri = os.getenv("MONGODB_URI")
    if not valid_uri:
        pytest.skip("MONGODB_URI not set")

    # Connect with link
    response = client.post(
        "/api/datasets/connect/",
        data=json.dumps({"uri": valid_uri}),
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "connection_id" in data
    connection_id = data["connection_id"]

    # Preview with connection_id
    preview_res = client.get(
        f"/api/datasets/Events/news_events/preview/?limit=2&connection_id={connection_id}"
    )
    assert preview_res.status_code == 200
    assert preview_res.json()["success"] is True

    # Disconnect
    disc_res = client.post(
        "/api/datasets/disconnect/",
        data=json.dumps({"connection_id": connection_id}),
        content_type="application/json",
    )
    assert disc_res.status_code == 200
    assert disc_res.json()["success"] is True
