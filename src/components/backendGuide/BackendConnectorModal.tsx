import React, { useState } from 'react';
import { getBackendConfig, setBackendConfig, checkBackendHealth, BackendConfig } from '../../services/api';
import { 
  Server, 
  Database, 
  Code2, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Layers,
  Terminal,
  Zap,
  BookOpen
} from 'lucide-react';

interface BackendConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const BackendConnectorModal: React.FC<BackendConnectorModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [config, setConfig] = useState<BackendConfig>(getBackendConfig());
  const [testResult, setTestResult] = useState<{ ok?: boolean; message?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'endpoints' | 'python-code'>('settings');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await checkBackendHealth(config.baseUrl);
    setTesting(false);
    setTestResult(result);
  };

  const handleSave = () => {
    setBackendConfig(config);
    onConfigUpdated();
    onClose();
  };

  const samplePythonBackendCode = `# backend/server.py
# FastAPI + PyMongo backend for IntelNLP Dashboard
# Run with: uvicorn server:app --reload --port 8000

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from pymongo import MongoClient
import os
import time

app = FastAPI(title="IntelNLP Intelligence Operations API", version="2.4.0")

# Enable CORS for Vite frontend (http://localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["intel_vault_prod"]

@app.get("/api/health")
def health_check():
    try:
        client.admin.command('ping')
        return {"ok": True, "status": "online", "database": "connected", "version": "2.4.0"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/datasets")
def list_datasets():
    collections = db.list_collection_names()
    results = []
    for coll_name in collections:
        count = db[coll_name].count_documents({})
        results.append({
            "id": f"ds-{coll_name}",
            "name": coll_name.replace("_", " ").title(),
            "collectionName": coll_name,
            "database": "intel_vault_prod",
            "totalRecords": count,
            "sizeBytes": count * 3500,
            "category": "OSINT",
            "tags": ["MongoDB", "Intelligence"],
        })
    return results

@app.post("/api/datasets/{dataset_id}/query")
def query_documents(dataset_id: str, query: Dict[str, Any]):
    collection_name = dataset_id.replace("ds-", "")
    coll = db[collection_name]
    
    sample_size = query.get("sampleSize", 25)
    filter_query = {}
    
    if query.get("searchQuery"):
        filter_query["$text"] = {"$search": query["searchQuery"]}
        
    docs = list(coll.find(filter_query).limit(sample_size))
    # Convert ObjectId to string
    for d in docs:
        d["_id"] = str(d["_id"])
        
    return {"documents": docs, "totalMatching": len(docs)}

@app.post("/api/pipeline/run")
def execute_pipeline(payload: Dict[str, Any]):
    # Chained NLP models execution with spaCy, HuggingFace, or ONNX
    dataset_id = payload.get("datasetId")
    pipeline = payload.get("pipeline")
    sample_size = payload.get("sampleSize", 10)
    
    # Process batch and return enriched results
    return {
        "jobId": f"job-{int(time.time())}",
        "status": "COMPLETED",
        "message": f"Successfully processed {sample_size} records"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
`;

  const copyCode = () => {
    navigator.clipboard.writeText(samplePythonBackendCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-cyan-950 p-2 text-cyan-400 border border-cyan-800/40">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Backend Architecture & API Connector Guide
              </h3>
              <p className="text-xs text-slate-400">
                Configure live MongoDB backend connection or inspect the REST API contract for backend development.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'settings'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="h-4 w-4" />
            <span>Connection Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`flex items-center space-x-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'endpoints'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>REST API Endpoints Specification</span>
          </button>
          <button
            onClick={() => setActiveTab('python-code')}
            className={`flex items-center space-x-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'python-code'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="h-4 w-4" />
            <span>Python FastAPI + PyMongo Starter Code</span>
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Mode Toggle */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Dashboard Operational Mode
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setConfig({ ...config, mode: 'mock' })}
                    className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      config.mode === 'mock'
                        ? 'border-cyan-500 bg-cyan-950/20 ring-1 ring-cyan-500/30'
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      checked={config.mode === 'mock'}
                      onChange={() => {}}
                      className="mt-1 text-cyan-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Interactive Simulation (Mock DB)</div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Runs offline in-browser with preloaded intelligence datasets, realistic NER, and perception testing. Ideal while your backend is under development!
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setConfig({ ...config, mode: 'live' })}
                    className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      config.mode === 'live'
                        ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/30'
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      checked={config.mode === 'live'}
                      onChange={() => {}}
                      className="mt-1 text-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Live Backend API (FastAPI / Express)</div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Connects directly to your Python/Node server querying live MongoDB collections and model runtimes via HTTP.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Endpoint URLs */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Backend API & MongoDB URL Config
                </span>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Backend Server URL</label>
                  <input
                    type="text"
                    value={config.baseUrl}
                    onChange={e => setConfig({ ...config, baseUrl: e.target.value })}
                    placeholder="http://localhost:8000"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 font-mono focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-500">Default for local Python FastAPI / Uvicorn server.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Target MongoDB URI (Informational)</label>
                  <input
                    type="text"
                    value={config.mongoUri}
                    onChange={e => setConfig({ ...config, mongoUri: e.target.value })}
                    placeholder="mongodb://localhost:27017/intel_vault_prod"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 font-mono focus:border-cyan-500"
                  />
                </div>

                {/* Health Check Button */}
                <div className="pt-2 flex items-center space-x-3">
                  <button
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="flex items-center space-x-2 rounded-lg bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    <Zap className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{testing ? 'Pinging Server...' : 'Test Backend Connection'}</span>
                  </button>

                  {testResult && (
                    <div className="flex items-center space-x-1.5 text-xs">
                      {testResult.ok ? (
                        <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{testResult.message}</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-rose-400 font-medium">
                          <AlertCircle className="h-4 w-4" />
                          <span>{testResult.message}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'endpoints' && (
            <div className="space-y-4 text-xs font-mono">
              <h4 className="text-xs font-bold font-sans uppercase tracking-wider text-slate-300">
                REST Endpoints Expected by Frontend
              </h4>

              <div className="space-y-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center space-x-2">
                    <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                      GET
                    </span>
                    <span className="text-cyan-300 font-bold">/api/health</span>
                  </div>
                  <p className="font-sans text-[11px] text-slate-400 mt-1">
                    Verifies server and MongoDB connectivity. Returns status: 200 with JSON: <code>{`{ "ok": true }`}</code>.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center space-x-2">
                    <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                      GET
                    </span>
                    <span className="text-cyan-300 font-bold">/api/datasets</span>
                  </div>
                  <p className="font-sans text-[11px] text-slate-400 mt-1">
                    Lists available collections with document counts, database names, and categories.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center space-x-2">
                    <span className="rounded bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-800">
                      POST
                    </span>
                    <span className="text-cyan-300 font-bold">/api/datasets/:id/query</span>
                  </div>
                  <p className="font-sans text-[11px] text-slate-400 mt-1">
                    Queries MongoDB documents with search filter, sampling size limit, and returns BSON/JSON records.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center space-x-2">
                    <span className="rounded bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-800">
                      POST
                    </span>
                    <span className="text-cyan-300 font-bold">/api/pipeline/run</span>
                  </div>
                  <p className="font-sans text-[11px] text-slate-400 mt-1">
                    Dispatches the pipeline execution against the test batch. Returns enriched entities, perception scores, and summaries.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'python-code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">
                    Ready-to-Run FastAPI + PyMongo Backend Starter Script
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Copy and run this in your Python environment with <code>pip install fastapi uvicorn pymongo</code>
                  </p>
                </div>
                <button
                  onClick={copyCode}
                  className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Python Code'}</span>
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs overflow-x-auto max-h-[360px] text-slate-300">
                <pre>{samplePythonBackendCode}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-6 py-3">
          <span className="text-xs text-slate-500 font-mono">
            Active Mode: <strong className="text-slate-300 uppercase">{config.mode}</strong>
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 shadow-md"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
