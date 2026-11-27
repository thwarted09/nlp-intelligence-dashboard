"""
Phase B Test Suite — Domain Classification Module & Server Integration
======================================================================
Tests:
  1. Military/war text -> 'Defence and Military'
  2. Election/governance text -> 'Politics and Governance'
  3. Stock market/interest rate text -> 'Economy and Finance'
  4. Technology text -> 'Technology' or 'Cybersecurity'
  5. Empty/blank text returns safe UNKNOWN result
  6. Threshold gating (< threshold -> UNKNOWN, below_threshold: True)
  7. Custom candidate domain labels override default taxonomy
  8. Batch domain classification on multi-domain list
  9. Server /api/pipeline/run integration with domain_classification task
"""

import sys
import os

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from nlp_engine.domain_classifier import (
    classify_domain,
    classify_domains_batch,
    DEFAULT_DOMAINS,
    DEFAULT_THRESHOLD,
)


def test_military_domain():
    text = (
        "Air defense battalions intercepted twelve cruise missiles and several drones "
        "near the frontline military outpost during overnight artillery shelling."
    )
    result = classify_domain(text)
    print(f"test_military_domain: domain={result['domain']}, score={result['score']}")
    assert result["task"] == "domain_classification"
    assert result["domain"] == "Defence and Military"
    assert result["score"] > 0.4
    assert not result["below_threshold"]
    assert "Defence and Military" in result["all_scores"]
    print("PASS: test_military_domain")


def test_politics_domain():
    text = (
        "The national parliament debated a contentious constitutional amendment "
        "ahead of upcoming general elections, with opposition lawmakers staging a walkout."
    )
    result = classify_domain(text)
    print(f"test_politics_domain: domain={result['domain']}, score={result['score']}")
    assert result["domain"] == "Politics and Governance"
    assert result["score"] >= 0.25
    assert not result["below_threshold"]
    print("PASS: test_politics_domain")


def test_economy_domain():
    text = (
        "The Federal Reserve decided to lower benchmark interest rates by 25 basis points "
        "to spur GDP growth amid signs of cooling consumer price index inflation and stock market volatility."
    )
    result = classify_domain(text)
    print(f"test_economy_domain: domain={result['domain']}, score={result['score']}")
    assert result["domain"] == "Economy and Finance"
    assert result["score"] > 0.4
    print("PASS: test_economy_domain")


def test_tech_domain():
    text = (
        "Engineers released a new open-source neural network architecture trained on 10,000 GPUs, "
        "achieving state-of-the-art benchmarks in automated code synthesis."
    )
    result = classify_domain(text)
    print(f"test_tech_domain: domain={result['domain']}, score={result['score']}")
    assert result["domain"] in ["Technology", "Cybersecurity"]
    assert result["score"] > 0.35
    print("PASS: test_tech_domain")


def test_empty_text():
    result = classify_domain("")
    assert result["domain"] == "UNKNOWN"
    assert result["score"] == 0.0
    assert result["below_threshold"] is True
    print("PASS: test_empty_text")


def test_threshold_gating():
    # Setting an unrealistically high threshold (e.g., 0.99) should mark result as UNKNOWN
    text = "The quick brown fox jumps over the lazy dog."
    result = classify_domain(text, threshold=0.99)
    assert result["below_threshold"] is True
    assert result["domain"] == "UNKNOWN"
    print("PASS: test_threshold_gating")


def test_custom_candidate_labels():
    text = "Doctors reported a significant decline in seasonal influenza hospitalizations after vaccination drives."
    custom_labels = ["Public Health & Medicine", "Heavy Industry", "Aerospace Exploration"]
    result = classify_domain(text, candidate_labels=custom_labels)
    assert result["domain"] == "Public Health & Medicine"
    assert "Public Health & Medicine" in result["all_scores"]
    print("PASS: test_custom_candidate_labels")


def test_batch_classification():
    texts = [
        "Soldiers secured the perimeter after tactical recon operations.",
        "Central banks raised benchmark lending rates to combat rising consumer price inflation and stabilize the bond markets.",
    ]
    results = classify_domains_batch(texts)
    assert len(results) == 2
    assert results[0]["domain"] == "Defence and Military"
    assert results[1]["domain"] == "Economy and Finance"
    print("PASS: test_batch_classification")


def test_server_pipeline_run_integration():
    from fastapi.testclient import TestClient
    from server import app

    client = TestClient(app)

    req_payload = {
        "documents": [
            {
                "_id": "doc-test-1",
                "text": "Armored divisions advanced towards fortified border bunkers amidst drone strikes.",
                "source": "OSINT Intercept"
            },
            {
                "_id": "doc-test-2",
                "text": "Stock market indices surged after commercial banks reported record quarterly lending profits and dividend payouts.",
                "source": "Financial Times"
            }
        ],
        "pipeline": {
            "stages": [
                {
                    "taskId": "domain_classification",
                    "enabled": True,
                    "parameters": {"confidenceThreshold": 0.25}
                },
                {
                    "taskId": "ner",
                    "enabled": True
                }
            ]
        }
    }

    res = client.post("/api/pipeline/run", json=req_payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["ok"] is True
    records = data["output"]["records"]
    assert len(records) == 2

    # Check doc 1
    doc1 = records[0]
    assert "domain" in doc1
    assert doc1["domain"]["domain"] == "Defence and Military"

    # Check doc 2
    doc2 = records[1]
    assert "domain" in doc2
    assert doc2["domain"]["domain"] == "Economy and Finance"

    # Check aggregate domainDistribution in stats
    stats = data["output"]["stats"]
    assert "domainDistribution" in stats
    assert stats["domainDistribution"]["Defence and Military"] == 1
    assert stats["domainDistribution"]["Economy and Finance"] == 1

    print("PASS: test_server_pipeline_run_integration")


if __name__ == "__main__":
    print("\n--- Running Phase B Tests ---")
    test_military_domain()
    test_politics_domain()
    test_economy_domain()
    test_tech_domain()
    test_empty_text()
    test_threshold_gating()
    test_custom_candidate_labels()
    test_batch_classification()
    test_server_pipeline_run_integration()
    print("\n=== ALL PHASE B TESTS PASSED SUCCESSFULLY! ===")
