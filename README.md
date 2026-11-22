# 🛰️ IntelNLP Studio — Intelligence Collection & Perception Testing Dashboard

An advanced, production-grade frontend workspace for testing, evaluating, and validating NLP pipelines on intelligence datasets collected and saved in MongoDB.

---

## 🌟 Key Features

### 1. 🗄️ Dataset Ingestion & Testing Partitioning
- **MongoDB Collection Selector**: Switch between ingested MongoDB collections (e.g., Geopolitical OSINT, Social Sentiment, Disinformation Streams, Crisis Feeds).
- **Flexible Test Sampling**: Quick presets (5, 10, 25, 50, 100 docs) or custom sample sizes.
- **Sampling Strategies**: Random uniform sampling, First N (sequential), or Most Recent first.
- **Granular Filtering**: Search keyword/regex across raw texts and filter by source type (`news`, `social_media`, `telegram`, `diplomatic_wire`, `threat_intel`, `forum`).
- **Interactive BSON Inspector**: View and copy full syntax-highlighted MongoDB documents (`ObjectId`, `ISODate`, nested metadata).

### 2. ⚙️ Modular NLP Pipeline Builder
- **Predefined NLP Tasks Library**:
  - 🏷️ **Named Entity Recognition (NER)** (spaCy transformer, BERT, GLiNER)
  - 🎭 **Perception & Sentiment Polarity** (Twitter-RoBERTa, FinBERT, VADER)
  - 🧭 **Target Stance & Narrative Alignment** (BART-Large MNLI Zero-Shot)
  - 🌊 **Affect Spectrum & Emotion Profiling** (DistilRoBERTa 6-channel emotion)
  - 🔍 **Narrative & Thematic Classification** (BERTopic, Zero-Shot MNLI)
  - 🔑 **Keyphrase & Salience Extraction** (KeyBERT MiniLM, YAKE)
  - 📝 **Executive Intelligence Summarization** (BART-Large CNN, Pegasus)
  - 🛡️ **Information Integrity & Toxicity Check** (Toxic-BERT, Propaganda signals)
- **Visual Chained Flow Graph**: Real-time architecture diagram displaying data flow from MongoDB to validated output.
- **Drag-free Reordering & Toggles**: Move stages up/down, toggle active status, and configure hyper-parameters (confidence threshold, models, output formats).
- **Preset Workflows**: 1-click loading for *Full OSINT Perception Suite*, *Rapid Sentiment Screener*, *Threat Integrity Triage*, and *Executive OSINT Briefer*.

### 3. ⚡ Execution Engine & Real-Time Telemetry
- **Live Progress Tracking**: Glowing progress bar with doc-level throughput (`docs/sec`), elapsed time, and ETA.
- **Streaming Terminal Logs**: Real-time console with log levels (`INFO`, `SUCCESS`, `WARN`, `ERROR`, `DEBUG`), keyword search, level filtering, auto-scroll toggle, and copy/download logs.

### 4. 📊 Output Inspection & Perception Validation
- **Interactive Entity Highlighter**: Clickable/hoverable colored tokens over extracted entities (`PERSON`, `ORG`, `GPE`, `EVENT`, `PRODUCT`) with confidence scores.
- **Perception Polarity Gauge**: Dynamic gauge from -1.0 (Critical/Hostile) to +1.0 (Supportive) with subjectivity index and stance detection.
- **Affect Spectrum Radar**: Breakdown of Fear, Anger, Trust, Joy, Sadness, and Surprise with escalation trigger alerts.
- **Executive 3-Bullet SITREP**: Leadership summaries distilled from lengthy dispatches.
- **Human-in-the-Loop Validation**: Flag low-confidence outputs, approve verified predictions, and record analyst notes.
- **Export Capabilities**: Export enriched results as JSON or CSV.

### 5. 🧪 Single-Text Real-Time Sandbox
- Paste any custom article or intercept on the fly to immediately run the pipeline in ~200ms without batch execution.

### 6. 🔌 Backend Connector & API Architecture Guide
- Built-in modal and guide with full REST API contract.
- Switch between **Simulation Mode** (in-browser mock DB) and **Live Backend API** (`http://localhost:8000`).
- Pre-configured `backend/` folder with complete FastAPI + PyMongo starter scripts.

---

## 🚀 Quick Start Guide

### Running the Frontend
```bash
# 1. Install dependencies (already installed)
npm install

# 2. Start Vite Development Server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🐍 Backend Starter (Learning Backend Development)

A starter backend using **FastAPI** and **PyMongo** is located in the `backend/` directory:

```bash
cd backend

# Install Python requirements
pip install -r requirements.txt

# (Optional) Seed your local MongoDB database
python seed_mongodb.py

# Launch FastAPI Server
python server.py
# Server runs on http://localhost:8000
```

Toggle the frontend top-right button to **"Live API"** to connect to your live Python backend!
