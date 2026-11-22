"""
Seed MongoDB with realistic Intelligence & Perception testing data.
Run:
    python seed_mongodb.py
"""

import os
from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "intel_vault_prod")

print(f"Connecting to MongoDB at {MONGO_URI}...")
client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]

osint_records = [
    {
        "source": "Reuters Diplomatic Wire",
        "sourceType": "news",
        "timestamp": "2026-10-12T14:22:10Z",
        "author": "Eleni Vance",
        "title": "Trilateral Strategic Maritime Agreement Finalized in Singapore",
        "text": "Delegations from Japan, South Korea, and the United States concluded negotiations today at the Shangri-La dialogue in Singapore, formalizing a joint maritime surveillance protocol for critical shipping lanes in the Malacca Strait. US Indo-Pacific Command confirmed deployment of unmanned autonomous reconnaissance drones by November. Chinese foreign ministry spokesperson Lin Jian issued a statement cautioning against external military alignment in regional waterways.",
        "language": "en",
        "metadata": {
            "region": "Asia-Pacific",
            "targetTopic": "Maritime Security",
            "rawTokens": 68,
            "verified": True
        }
    },
    {
        "source": "Baltic Defense Monitor",
        "sourceType": "news",
        "timestamp": "2026-10-12T12:05:45Z",
        "author": "Marek Zilinskas",
        "title": "Critical Underwater Infrastructure Sensor Network Deployed Along Gulf of Finland",
        "text": "Estonia and Finland have completed the activation of acoustic monitoring arrays along submarine gas and telecommunication conduits across the Gulf of Finland. NATO Allied Command Maritime Operations in Northwood validated the real-time telemetry link. Officials noted three unidentified vessels loitering near cable coordinates 59.78N 24.52E earlier this week.",
        "language": "en",
        "metadata": {
            "region": "Northern Europe",
            "targetTopic": "Subsea Infrastructure",
            "rawTokens": 62,
            "verified": True
        }
    },
    {
        "source": "Telegram Channel // ShadowAlert_EU",
        "sourceType": "telegram",
        "timestamp": "2026-10-13T07:18:22Z",
        "author": "ShadowAdmin",
        "text": "URGENT LEAK: Central Bank secretly planning mandatory digital currency freeze on personal accounts exceeding 5,000 EUR starting next month. Major supermarkets in Berlin and Paris will stop accepting cash immediately. Move your assets now before bank holiday announcement!! #CBDC #Hyperinflation",
        "language": "en",
        "metadata": {
            "channel": "@ShadowAlert_EU",
            "targetTopic": "Financial Panic Narrative",
            "rawTokens": 50,
            "verified": False,
            "botLikelihoodScore": 0.94
        }
    }
]

coll = db["intel_osint_geopolitics"]
coll.delete_many({}) # clear old
coll.insert_many(osint_records)
print(f"Successfully seeded {len(osint_records)} records into {DATABASE_NAME}.intel_osint_geopolitics")
