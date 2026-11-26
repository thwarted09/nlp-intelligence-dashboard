"""
IntelNLP Studio - Dynamic MongoDB Connector & Real NLP Inference Backend
Powered by FastAPI, PyMongo, spaCy (en_core_web_sm), and VADER Sentiment.
"""

import os
import time
import re
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId

# Real NLP Libraries
import spacy
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

print("Loading real spaCy (en_core_web_sm) and VADER sentiment models...")
try:
    nlp = spacy.load("en_core_web_sm")
    print("spaCy model loaded successfully.")
except Exception as e:
    print(f"Warning: could not load en_core_web_sm ({e}), creating blank English pipeline.")
    nlp = spacy.blank("en")

sia = SentimentIntensityAnalyzer()
print("VADER sentiment analyzer initialized.")

app = FastAPI(
    title="IntelNLP Dynamic MongoDB Connector & NLP Inference API",
    description="Backend API connecting to MongoDB and executing real spaCy + VADER NLP models",
    version="3.5.0"
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Client Connection Cache
CLIENT_CACHE: Dict[str, MongoClient] = {}

def get_mongo_client(uri: str) -> MongoClient:
    clean_uri = uri.strip()
    if not clean_uri:
        raise HTTPException(status_code=400, detail="MongoDB URI cannot be empty")
    
    if clean_uri in CLIENT_CACHE:
        try:
            client = CLIENT_CACHE[clean_uri]
            client.admin.command("ping")
            return client
        except Exception:
            del CLIENT_CACHE[clean_uri]

    try:
        client = MongoClient(clean_uri, serverSelectionTimeoutMS=4000)
        client.admin.command("ping")
        CLIENT_CACHE[clean_uri] = client
        return client
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to connect to MongoDB with provided link: {str(e)}"
        )


class ConnectRequest(BaseModel):
    uri: str


class CollectionsRequest(BaseModel):
    uri: str
    database: str


class QueryDataRequest(BaseModel):
    uri: str
    database: str
    collection: str
    sampleSize: Optional[int] = 25
    samplingMethod: Optional[str] = "random"  # 'random' | 'first_n' | 'recent'
    searchQuery: Optional[str] = ""
    textField: Optional[str] = ""


class PipelineRunRequest(BaseModel):
    documents: List[Dict[str, Any]]
    pipeline: Dict[str, Any]
    targetTopic: Optional[str] = "Regional Security & Geopolitical Stability"


@app.get("/api/health")
def health_check():
    return {
        "ok": True,
        "status": "online",
        "service": "IntelNLP Dynamic MongoDB Connector & Real NLP Inference",
        "models": {
            "ner": "spaCy en_core_web_sm (v3.8.0)",
            "sentiment": "VADER Lexicon Intensity Analyzer (v3.3.2)"
        },
        "version": "3.5.0"
    }


@app.post("/api/mongo/connect")
def connect_and_discover(req: ConnectRequest):
    """
    Connects to the MongoDB instance using the provided link (URI)
    and lists all accessible databases.
    """
    client = get_mongo_client(req.uri)
    try:
        databases = client.list_database_names()
        db_summaries = []
        for db_name in databases:
            try:
                db = client[db_name]
                colls = db.list_collection_names()
                db_summaries.append({
                    "name": db_name,
                    "collectionsCount": len(colls),
                    "isSystem": db_name in ["admin", "config", "local"]
                })
            except Exception:
                db_summaries.append({
                    "name": db_name,
                    "collectionsCount": 0,
                    "isSystem": True
                })

        user_dbs = [d for d in db_summaries if not d["isSystem"]]
        default_db = user_dbs[0]["name"] if user_dbs else (db_summaries[0]["name"] if db_summaries else "test")

        return {
            "ok": True,
            "connected": True,
            "message": f"Successfully connected to MongoDB ({len(databases)} databases found)",
            "databases": db_summaries,
            "defaultDatabase": default_db
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing databases: {str(e)}")


@app.post("/api/mongo/collections")
def list_collections(req: CollectionsRequest):
    """
    Lists all collections in the selected database with document counts,
    estimated size, and detected field schema.
    """
    client = get_mongo_client(req.uri)
    try:
        db = client[req.database]
        collection_names = db.list_collection_names()
        collections_info = []

        for name in collection_names:
            coll = db[name]
            try:
                count = coll.count_documents({})
            except Exception:
                count = coll.estimated_document_count()

            sample_doc = coll.find_one({})
            sample_fields = []
            detected_text_field = "text"
            if sample_doc:
                for k in sample_doc.keys():
                    sample_fields.append(k)
                    if k.lower() in ["text", "content", "body", "message", "description", "article", "tweet"]:
                        detected_text_field = k

            collections_info.append({
                "name": name,
                "documentCount": count,
                "detectedTextField": detected_text_field,
                "fields": sample_fields[:12],
                "sizeBytes": count * 1500,
            })

        return {
            "ok": True,
            "database": req.database,
            "collections": collections_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching collections: {str(e)}")


@app.post("/api/mongo/query")
def query_documents(req: QueryDataRequest):
    """
    Queries real documents from the selected collection with sampling strategy,
    sample size limit, and optional keyword search.
    """
    client = get_mongo_client(req.uri)
    try:
        db = client[req.database]
        coll = db[req.collection]

        total_count = coll.count_documents({})
        sample_size = max(1, min(req.sampleSize or 25, 500))

        filter_query = {}
        if req.searchQuery and req.searchQuery.strip():
            q = req.searchQuery.strip()
            if req.textField and req.textField != "auto":
                filter_query[req.textField] = {"$regex": q, "$options": "i"}
            else:
                filter_query["$or"] = [
                    {"text": {"$regex": q, "$options": "i"}},
                    {"title": {"$regex": q, "$options": "i"}},
                    {"content": {"$regex": q, "$options": "i"}},
                    {"source": {"$regex": q, "$options": "i"}},
                    {"body": {"$regex": q, "$options": "i"}},
                ]

        raw_docs = []

        if req.samplingMethod == "random" and not filter_query:
            pipeline = [{"$sample": {"size": sample_size}}]
            cursor = coll.aggregate(pipeline)
            raw_docs = list(cursor)
        elif req.samplingMethod == "recent":
            cursor = coll.find(filter_query).sort("_id", -1).limit(sample_size)
            raw_docs = list(cursor)
        else:
            cursor = coll.find(filter_query).limit(sample_size)
            raw_docs = list(cursor)

        standardized_docs = []
        for doc in raw_docs:
            doc_id = str(doc.get("_id", ""))
            
            text_val = ""
            for field in [req.textField, "text", "content", "body", "message", "description", "article", "tweet"]:
                if field and field in doc and isinstance(doc[field], str) and doc[field].strip():
                    text_val = doc[field]
                    break
            
            if not text_val:
                text_val = str(doc.get("title", "")) or " ".join([str(v) for k, v in doc.items() if k != "_id" and isinstance(v, str)])
            
            title_val = doc.get("title", "") or (text_val[:60] + "..." if len(text_val) > 60 else text_val)
            source_val = doc.get("source", "") or doc.get("platform", "") or doc.get("channel", "") or "MongoDB Intercept"
            source_type = doc.get("sourceType", "") or doc.get("type", "") or "news"
            timestamp_val = str(doc.get("timestamp", "")) or str(doc.get("createdAt", "")) or str(doc.get("date", "")) or time.strftime("%Y-%m-%dT%H:%M:%SZ")

            serializable_raw = {}
            for k, v in doc.items():
                if isinstance(v, ObjectId):
                    serializable_raw[k] = str(v)
                elif hasattr(v, "isoformat"):
                    serializable_raw[k] = v.isoformat()
                else:
                    serializable_raw[k] = v

            standardized_docs.append({
                "_id": doc_id,
                "source": str(source_val),
                "sourceType": str(source_type),
                "timestamp": timestamp_val,
                "title": str(title_val) if title_val else None,
                "text": text_val,
                "language": doc.get("language", "en"),
                "rawMongo": serializable_raw,
                "metadata": {
                    "rawTokens": len(text_val.split()),
                    "verified": bool(doc.get("verified", True)),
                    "collection": req.collection,
                    "database": req.database
                }
            })

        return {
            "ok": True,
            "database": req.database,
            "collection": req.collection,
            "totalInCollection": total_count,
            "matchingCount": len(standardized_docs),
            "documents": standardized_docs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying documents: {str(e)}")


@app.post("/api/pipeline/run")
def execute_pipeline(req: PipelineRunRequest):
    """
    Executes real spaCy NER, VADER Sentiment analysis, and Extractive SITREP summarization
    on the chosen MongoDB documents adhering to the Phase A standard schema.
    """
    job_id = f"job-{int(time.time())}"
    documents = req.documents
    stages = req.pipeline.get("stages", [])
    active_stages = [s for s in stages if s.get("enabled", True)]
    active_task_ids = {s.get("taskId") for s in active_stages}

    results = []
    total_latency = 0
    pos_count, neu_count, neg_count = 0, 0, 0
    entity_map = {}
    flagged_count = 0

    for doc in documents:
        text = doc.get("text", "")
        start_t = time.time()
        
        # Real spaCy document processing
        spacy_doc = nlp(text)

        # -------------------------------------------------------------------------
        # A1. Real Named Entity Recognition (spaCy en_core_web_sm)
        # -------------------------------------------------------------------------
        entities = []
        if "ner" in active_task_ids or not active_task_ids:
            seen_spans = set()
            for ent in spacy_doc.ents:
                raw_label = ent.label_
                # Map to required standard schema: GPE & LOC -> LOCATION, ORG -> ORGANIZATION
                if raw_label in ["GPE", "LOC"]:
                    std_label = "LOCATION"
                elif raw_label == "ORG":
                    std_label = "ORGANIZATION"
                elif raw_label == "PERSON":
                    std_label = "PERSON"
                elif raw_label in ["PRODUCT", "WORK_OF_ART"]:
                    std_label = "PRODUCT"
                elif raw_label == "EVENT":
                    std_label = "EVENT"
                else:
                    std_label = raw_label

                span_key = (ent.start_char, ent.end_char)
                if span_key not in seen_spans:
                    seen_spans.add(span_key)
                    # Adhere strictly to Required Schema (no fabricated confidence scores)
                    entities.append({
                        "text": ent.text,
                        "label": std_label,
                        "source_label": raw_label,
                        "start": ent.start_char,
                        "end": ent.end_char,
                        "category": std_label  # Backward-compatibility alias
                    })
                    entity_map[ent.text] = entity_map.get(ent.text, 0) + 1

        # -------------------------------------------------------------------------
        # A2. Real VADER Sentiment Analysis
        # -------------------------------------------------------------------------
        vader_res = sia.polarity_scores(text)
        compound = round(vader_res["compound"], 4)
        pos = round(vader_res["pos"], 4)
        neg = round(vader_res["neg"], 4)
        neu = round(vader_res["neu"], 4)

        # Standard VADER compound thresholds: >= 0.05 positive, <= -0.05 negative, else neutral
        if compound >= 0.05:
            sentiment_label = "positive"
            pos_count += 1
        elif compound <= -0.05:
            sentiment_label = "negative"
            neg_count += 1
        else:
            sentiment_label = "neutral"
            neu_count += 1

        vader_output = {
            "pos": pos,
            "neg": neg,
            "neu": neu,
            "compound": compound,
            "label": sentiment_label
        }

        # -------------------------------------------------------------------------
        # A3. Real Extractive SITREP Summarization (Sentence segmentation with traceability)
        # -------------------------------------------------------------------------
        sentence_spans = []
        for idx, sent in enumerate(spacy_doc.sents):
            s_text = sent.text.strip()
            if len(s_text) > 10:
                sentence_spans.append({
                    "sentence_idx": idx,
                    "text": s_text,
                    "start": sent.start_char,
                    "end": sent.end_char
                })

        if len(sentence_spans) >= 3:
            selected_bullets = [sentence_spans[0], sentence_spans[len(sentence_spans)//2], sentence_spans[-1]]
        elif sentence_spans:
            selected_bullets = sentence_spans[:3]
        else:
            selected_bullets = [{
                "sentence_idx": 0,
                "text": text[:150],
                "start": 0,
                "end": min(len(text), 150)
            }]

        bullet_texts = [b["text"] for b in selected_bullets]
        summary_output = {
            "type": "extractive",
            "bulletPoints": bullet_texts,
            "bulletsWithTraceability": selected_bullets,
            "tldr": bullet_texts[0] if bullet_texts else text[:120]
        }

        # -------------------------------------------------------------------------
        # Keyphrase Extraction (spaCy noun chunks)
        # -------------------------------------------------------------------------
        keyphrases = []
        seen_phrases = set()
        for chunk in spacy_doc.noun_chunks:
            clean_chunk = chunk.text.strip()
            norm_phrase = " ".join(clean_chunk.split()).lower()
            if len(clean_chunk.split()) > 1 and norm_phrase not in seen_phrases and not chunk.root.is_stop:
                seen_phrases.add(norm_phrase)
                keyphrases.append({"phrase": clean_chunk})
                if len(keyphrases) >= 5:
                    break

        if not keyphrases:
            keyphrases = [{"phrase": "Intelligence Intercept"}]

        # Elapsed processing latency
        elapsed_ms = int((time.time() - start_t) * 1000)
        total_latency += elapsed_ms

        results.append({
            "docId": doc.get("_id", f"doc-{len(results)}"),
            "originalDoc": doc,
            "cleanedText": text,
            "language": doc.get("language", "en"),
            "entities": entities,
            "perception": {
                "sentiment": sentiment_label.upper(),
                "polarityScore": compound,
                "subjectivityScore": round(1.0 - neu, 4),
                "vader": vader_output
            },
            "keyphrases": keyphrases,
            "summary": summary_output,
            "processingTimeMs": elapsed_ms,
            "humanValidation": {
                "status": "pending"
            }
        })

    top_entities = [{"name": k, "category": "ENTITY", "count": v} for k, v in sorted(entity_map.items(), key=lambda x: x[1], reverse=True)[:8]]

    output_data = {
        "jobId": job_id,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "totalRecords": len(results),
        "records": results,
        "modelsUsed": {
            "ner": "spaCy en_core_web_sm (v3.8.0)",
            "sentiment": "VADER Lexicon Intensity Analyzer (v3.3.2)",
            "summarization": "spaCy Sentence Segmenter (Extractive SITREP)"
        },
        "stats": {
            "sentimentDistribution": {
                "positive": pos_count,
                "neutral": neu_count,
                "negative": neg_count
            },
            "topEntities": top_entities,
            "topTopics": [],
            "flaggedCount": flagged_count,
            "avgLatencyMs": int(total_latency / max(1, len(results)))
        }
    }

    return {
        "ok": True,
        "jobId": job_id,
        "status": "COMPLETED",
        "totalProcessed": len(results),
        "output": output_data
    }


if __name__ == "__main__":
    import uvicorn
    print("Starting IntelNLP Dynamic MongoDB Connector & spaCy/VADER NLP Server on http://localhost:8000...")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
