import json
import os
import pytest
from django.test import Client
from dotenv import load_dotenv

load_dotenv(".env")


@pytest.fixture
def client():
    return Client()


@pytest.fixture
def mongo_uri():
    uri = os.getenv("MONGODB_URI")
    if not uri:
        pytest.skip("MONGODB_URI not found for testing")
    return uri


def test_dashboard_page(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"MongoDB Link Connector" in response.content
    assert b"MongoDB Connection URL / Link" in response.content


def test_unconnected_state(client):
    # Without a connection_id, status reports not connected
    status_res = client.get("/api/datasets/status/")
    assert status_res.status_code == 200
    assert status_res.json()["connected"] is False

    # Datasets returns empty list
    list_res = client.get("/api/datasets/")
    assert list_res.status_code == 200
    assert list_res.json()["count"] == 0

    # Operation without connection_id fails with 400
    prev_res = client.get("/api/datasets/Events/news_events/preview/")
    assert prev_res.status_code == 400
    assert "Please connect via a MongoDB URL link first" in prev_res.json()["error"]


def test_connect_invalid_uri(client):
    response = client.post(
        "/api/datasets/connect/",
        data=json.dumps({"uri": "invalid_mongo_uri"}),
        content_type="application/json",
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False


def test_url_link_lifecycle_and_exploration(client, mongo_uri):
    # 1. Connect using full URL link pointing to droneDB/drones
    full_link = mongo_uri.rstrip("/") + "/droneDB/drones"
    connect_res = client.post(
        "/api/datasets/connect/",
        data=json.dumps({"uri": full_link}),
        content_type="application/json",
    )
    assert connect_res.status_code == 200
    conn_data = connect_res.json()
    assert conn_data["success"] is True
    assert conn_data["default_database"] == "droneDB"
    assert conn_data["default_collection"] == "drones"
    cid = conn_data["connection_id"]

    # 2. Check connection status for this connection_id
    status_res = client.get(f"/api/datasets/status/?connection_id={cid}")
    assert status_res.status_code == 200
    assert status_res.json()["connected"] is True

    # 3. List datasets for this connection_id
    datasets_res = client.get(f"/api/datasets/?connection_id={cid}")
    assert datasets_res.status_code == 200
    assert datasets_res.json()["count"] > 0

    # 4. Preview collection with pagination
    preview_res = client.get(f"/api/datasets/droneDB/drones/preview/?limit=3&page=1&connection_id={cid}")
    assert preview_res.status_code == 200
    prev_data = preview_res.json()
    assert prev_data["success"] is True
    assert prev_data["returned_records"] <= 3
    assert prev_data["page"] == 1
    assert "total_pages" in prev_data
    assert len(prev_data["fields"]) > 0

    # 4b. Test higher limit (e.g. limit=500)
    high_limit_res = client.get(f"/api/datasets/droneDB/drones/preview/?limit=500&connection_id={cid}")
    assert high_limit_res.status_code == 200
    assert high_limit_res.json()["limit"] == 500

    # 5. Schema inspection
    schema_res = client.get(f"/api/datasets/droneDB/drones/schema/?connection_id={cid}")
    assert schema_res.status_code == 200
    assert schema_res.json()["total_records"] > 0

    # 6. Filter
    filter_res = client.get(f"/api/datasets/droneDB/drones/filter/?limit=2&connection_id={cid}")
    assert filter_res.status_code == 200
    assert filter_res.json()["success"] is True

    # 7. Sample ($sample)
    sample_res = client.get(f"/api/datasets/droneDB/drones/sample/?size=2&connection_id={cid}")
    assert sample_res.status_code == 200
    assert sample_res.json()["returned_records"] <= 2

    # 8. Disconnect
    disc_res = client.post(
        "/api/datasets/disconnect/",
        data=json.dumps({"connection_id": cid}),
        content_type="application/json",
    )
    assert disc_res.status_code == 200
    assert disc_res.json()["success"] is True
