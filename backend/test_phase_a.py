"""
Automated Regression Test Suite for Phase A: Correct Existing Implementations.
Validates:
1. NER output schema: label=LOCATION, source_label, exact offsets text[start:end], no fake confidence.
2. VADER sentiment: pos, neg, neu, compound, correct thresholds (>=0.05, <=-0.05), no stance/fake confidence.
3. Extractive SITREP: type="extractive", 3 bullets, sentence indices and character offsets for traceability.
4. Error handling: invalid payloads, empty text handling.
"""

import sys
import unittest
from fastapi.testclient import TestClient

# Import the FastAPI app from server
from server import app, nlp, sia

client = TestClient(app)


class TestPhaseACorrections(unittest.TestCase):
    def setUp(self):
        self.sample_text_1 = (
            "Indian Prime Minister Narendra Modi met with Google CEO Sundar Pichai in New Delhi. "
            "They discussed expanding Artificial Intelligence research and launching the new Pixel device in India. "
            "Both leaders expressed strong optimism for technological cooperation across the region."
        )
        self.sample_text_2 = (
            "Severe casualties and destruction were reported following an urgent attack on the northern border outpost. "
            "Local authorities issued emergency warnings and strongly condemned the unprovoked military aggression."
        )
        self.sample_text_neutral = (
            "The train departed from platform four at 08:30 and arrived at 09:15. "
            "Passengers disembarked on the west platform according to the scheduled timetable."
        )

    # -------------------------------------------------------------------------
    # A1. NER Output Schema Tests
    # -------------------------------------------------------------------------
    def test_ner_schema_and_offset_alignment(self):
        """Test that entities follow required schema and character offsets are exact."""
        payload = {
            "documents": [
                {"_id": "doc-test-1", "text": self.sample_text_1, "language": "en"}
            ],
            "pipeline": {
                "stages": [{"taskId": "ner", "enabled": True}]
            }
        }
        res = client.post("/api/pipeline/run", json=payload)
        self.assertEqual(res.status_code, 200, f"Pipeline run failed: {res.text}")
        data = res.json()
        self.assertTrue(data["ok"])
        records = data["output"]["records"]
        self.assertEqual(len(records), 1)

        entities = records[0]["entities"]
        self.assertGreater(len(entities), 0, "Expected at least one entity extracted")

        found_location = False
        for ent in entities:
            # 1. Required keys
            self.assertIn("text", ent)
            self.assertIn("label", ent)
            self.assertIn("source_label", ent)
            self.assertIn("start", ent)
            self.assertIn("end", ent)

            # 2. Fabricated confidence must be ABSENT
            self.assertNotIn("confidence", ent, "Fabricated confidence score should NOT be present in entity schema")

            # 3. Exact character offset alignment
            extracted_text = ent["text"]
            start = ent["start"]
            end = ent["end"]
            self.assertEqual(
                self.sample_text_1[start:end],
                extracted_text,
                f"Offset mismatch: text[{start}:{end}] is '{self.sample_text_1[start:end]}', expected '{extracted_text}'"
            )

            # 4. Standard mapping check: GPE / LOC -> LOCATION
            if ent["source_label"] in ["GPE", "LOC"]:
                self.assertEqual(ent["label"], "LOCATION", "GPE and LOC must be mapped to LOCATION")
                found_location = True

        self.assertTrue(found_location, "Expected at least one LOCATION entity in India / New Delhi text")

    def test_ner_duplicate_span_prevention(self):
        """Test that identical spans are deduplicated."""
        payload = {
            "documents": [
                {"_id": "doc-dup", "text": "India visited India today in India.", "language": "en"}
            ],
            "pipeline": {
                "stages": [{"taskId": "ner", "enabled": True}]
            }
        }
        res = client.post("/api/pipeline/run", json=payload)
        self.assertEqual(res.status_code, 200)
        entities = res.json()["output"]["records"][0]["entities"]
        # Spans must all be distinct
        spans = [(e["start"], e["end"]) for e in entities]
        self.assertEqual(len(spans), len(set(spans)), "Duplicate entity spans detected")

    # -------------------------------------------------------------------------
    # A2. VADER Sentiment Tests
    # -------------------------------------------------------------------------
    def test_vader_sentiment_positive_threshold(self):
        """Test that positive text returns compound >= 0.05 and label 'positive'."""
        payload = {
            "documents": [{"_id": "pos-doc", "text": self.sample_text_1}],
            "pipeline": {"stages": [{"taskId": "sentiment_perception", "enabled": True}]}
        }
        res = client.post("/api/pipeline/run", json=payload)
        self.assertEqual(res.status_code, 200)
        record = res.json()["output"]["records"][0]
        perception = record["perception"]
        vader = perception["vader"]

        # Verify complete VADER schema
        self.assertIn("pos", vader)
        self.assertIn("neg", vader)
        self.assertIn("neu", vader)
        self.assertIn("compound", vader)
        self.assertIn("label", vader)

        self.assertGreaterEqual(vader["compound"], 0.05)
        self.assertEqual(vader["label"], "positive")
        self.assertEqual(perception["sentiment"], "POSITIVE")

        # Stance and fake model confidence must be absent from perception
        self.assertNotIn("stance", perception, "Misleading stance field should be removed")
        self.assertNotIn("confidence", perception, "Fake confidence field should be removed")

    def test_vader_sentiment_negative_threshold(self):
        """Test that hostile/casualty text returns compound <= -0.05 and label 'negative'."""
        payload = {
            "documents": [{"_id": "neg-doc", "text": self.sample_text_2}],
            "pipeline": {"stages": [{"taskId": "sentiment_perception", "enabled": True}]}
        }
        res = client.post("/api/pipeline/run", json=payload)
        self.assertEqual(res.status_code, 200)
        record = res.json()["output"]["records"][0]
        vader = record["perception"]["vader"]

        self.assertLessEqual(vader["compound"], -0.05)
        self.assertEqual(vader["label"], "negative")
        self.assertEqual(record["perception"]["sentiment"], "NEGATIVE")

    def test_vader_sentiment_neutral_threshold(self):
        """Test that matter-of-fact text returns compound between -0.05 and 0.05 and label 'neutral'."""
        payload = {
            "documents": [{"_id": "neu-doc", "text": self.sample_text_neutral}],
            "pipeline": {"stages": [{"taskId": "sentiment_perception", "enabled": True}]}
        }
        res = client.post("/api/pipeline/run", json=payload)
        self.assertEqual(res.status_code, 200)
        record = res.json()["output"]["records"][0]
        vader = record["perception"]["vader"]

        self.assertGreater(vader["compound"], -0.05)
        self.assertLess(vader["compound"], 0.05)
        self.assertEqual(vader["label"], "neutral")
        self.assertEqual(record["perception"]["sentiment"], "NEUTRAL")

    # -------------------------------------------------------------------------
    # A3. Extractive SITREP Summary Tests
    # -------------------------------------------------------------------------
    def test_extractive_sitrep_summary(self):
        """Test that summary is explicitly labeled extractive with sentence traceability."""
        payload = {
            "documents": [{"_id": "sitrep-doc", "text": self.sample_text_1}],
            "pipeline": {"stages": [{"taskId": "summarization", "enabled": True}]}
        }
        res = client.post("/api/pipeline/run", json=payload)
        self.assertEqual(res.status_code, 200)
        record = res.json()["output"]["records"][0]
        summary = record["summary"]

        self.assertEqual(summary["type"], "extractive", "Summary must be explicitly identified as 'extractive'")
        self.assertIn("bulletPoints", summary)
        self.assertLessEqual(len(summary["bulletPoints"]), 3, "Extractive summary must be at most 3 bullets")
        self.assertGreater(len(summary["bulletPoints"]), 0)

        # Check traceability
        traceability = summary.get("bulletsWithTraceability", [])
        self.assertGreater(len(traceability), 0, "Expected traceability metadata")
        for item in traceability:
            self.assertIn("sentence_idx", item)
            self.assertIn("text", item)
            self.assertIn("start", item)
            self.assertIn("end", item)
            # Offset check
            s = item["start"]
            e = item["end"]
            self.assertEqual(self.sample_text_1[s:e], item["text"], "Traceability character offsets must match text")

    # -------------------------------------------------------------------------
    # Error Handling & Edge Cases
    # -------------------------------------------------------------------------
    def test_empty_text_handling(self):
        """Test that empty document text does not crash the pipeline."""
        payload = {
            "documents": [{"_id": "empty-doc", "text": "", "language": "en"}],
            "pipeline": {"stages": []}
        }
        res = client.post("/api/pipeline/run", json=payload)
        self.assertEqual(res.status_code, 200)
        record = res.json()["output"]["records"][0]
        self.assertEqual(record["entities"], [])
        self.assertEqual(record["perception"]["sentiment"], "NEUTRAL")

    def test_missing_documents_validation(self):
        """Test that request with missing documents produces 422 validation error."""
        res = client.post("/api/pipeline/run", json={"pipeline": {}})
        self.assertEqual(res.status_code, 422)


if __name__ == "__main__":
    unittest.main()
