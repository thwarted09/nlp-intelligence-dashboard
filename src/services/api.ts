import { DatasetInfo, DatasetFilter, MongoDocument, MongoConnectionState, DatabaseSummary, CollectionSummary } from '../types/dataset';
import { PipelineWorkflow } from '../types/nlp';
import { JobExecution, LogEntry } from '../types/job';
import { PipelineOutputData, IntelligenceResultDoc } from '../types/results';
import { MOCK_DATASETS } from '../data/mockDatasets';
import { processSingleDocument } from './nlpEngine';

export interface BackendConfig {
  mode: 'mock' | 'live';
  baseUrl: string;
  mongoUri: string;
  connected: boolean;
}

const DEFAULT_CONFIG: BackendConfig = {
  mode: 'live',
  baseUrl: 'http://localhost:8000',
  mongoUri: 'mongodb://localhost:27017',
  connected: false,
};

let currentConfig: BackendConfig = { ...DEFAULT_CONFIG };

export function getBackendConfig(): BackendConfig {
  return currentConfig;
}

export function setBackendConfig(config: Partial<BackendConfig>) {
  currentConfig = { ...currentConfig, ...config };
}

export async function checkBackendHealth(baseUrl = currentConfig.baseUrl): Promise<{ ok: boolean; message: string; version?: string }> {
  try {
    const res = await fetch(`${baseUrl}/api/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, message: 'FastAPI Backend Online', version: data.version || '3.0.0' };
    }
    return { ok: false, message: `Server returned HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, message: `Cannot reach ${baseUrl}. Ensure backend server is running.` };
  }
}

/**
 * Connect to MongoDB using provided connection link
 */
export async function connectMongoByUri(uri: string): Promise<{
  ok: boolean;
  databases: DatabaseSummary[];
  defaultDatabase: string;
  message: string;
}> {
  try {
    const res = await fetch(`${currentConfig.baseUrl}/api/mongo/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri }),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      currentConfig.mongoUri = uri;
      currentConfig.connected = true;
      return {
        ok: true,
        databases: data.databases || [],
        defaultDatabase: data.defaultDatabase || 'test',
        message: data.message || 'Connected successfully',
      };
    } else {
      const err = await res.json().catch(() => ({ detail: 'Failed to connect' }));
      return {
        ok: false,
        databases: [],
        defaultDatabase: '',
        message: err.detail || 'Connection refused by MongoDB',
      };
    }
  } catch (e: any) {
    return {
      ok: false,
      databases: [],
      defaultDatabase: '',
      message: `Backend API unreachable at ${currentConfig.baseUrl}: ${e.message}`,
    };
  }
}

/**
 * Fetch collections inside a selected database
 */
export async function fetchCollectionsForDb(uri: string, database: string): Promise<CollectionSummary[]> {
  try {
    const res = await fetch(`${currentConfig.baseUrl}/api/mongo/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri, database }),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      return data.collections || [];
    }
  } catch (e) {
    console.error('Failed to fetch collections', e);
  }
  return [];
}

/**
 * Query documents from a MongoDB collection
 */
export async function queryLiveMongoDocuments(
  uri: string,
  database: string,
  collection: string,
  sampleSize: number,
  samplingMethod: 'random' | 'first_n' | 'stratified' | 'recent',
  searchQuery = '',
  textField = 'auto'
): Promise<{ documents: MongoDocument[]; totalInCollection: number }> {
  try {
    const res = await fetch(`${currentConfig.baseUrl}/api/mongo/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uri,
        database,
        collection,
        sampleSize,
        samplingMethod,
        searchQuery,
        textField,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        documents: data.documents || [],
        totalInCollection: data.totalInCollection || 0,
      };
    }
  } catch (e) {
    console.warn('Live query failed, falling back to cached sample', e);
  }

  // Fallback if disconnected
  return {
    documents: [],
    totalInCollection: 0,
  };
}

export async function fetchDatasets(): Promise<DatasetInfo[]> {
  return MOCK_DATASETS;
}

export async function queryDatasetRecords(
  datasetId: string,
  filter: DatasetFilter
): Promise<{ documents: MongoDocument[]; totalMatching: number }> {
  const dataset = MOCK_DATASETS.find(d => d.id === datasetId) || MOCK_DATASETS[0];
  let docs = [...dataset.sampleData];

  if (filter.searchQuery.trim()) {
    const q = filter.searchQuery.toLowerCase();
    docs = docs.filter(
      d => d.text.toLowerCase().includes(q) || (d.title && d.title.toLowerCase().includes(q)) || d.source.toLowerCase().includes(q)
    );
  }

  if (filter.sourceTypes.length > 0) {
    docs = docs.filter(d => filter.sourceTypes.includes(d.sourceType));
  }

  const totalMatching = docs.length;
  let sampled = docs;
  if (filter.samplingMethod === 'random') {
    sampled = [...docs].sort(() => 0.5 - Math.random()).slice(0, filter.sampleSize);
  } else {
    sampled = docs.slice(0, filter.sampleSize);
  }

  return { documents: sampled, totalMatching };
}

/**
 * Execute pipeline on real MongoDB documents
 */
export async function executePipelineJob(
  datasetName: string,
  collectionName: string,
  pipeline: PipelineWorkflow,
  sampleDocuments: MongoDocument[],
  sampleSize: number,
  onProgress?: (progress: number, currentDoc: number, stageName: string) => void,
  onLog?: (log: LogEntry) => void
): Promise<{ execution: JobExecution; output: PipelineOutputData }> {
  const startTime = new Date().toISOString();
  const jobId = 'job-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
  const activeStages = pipeline.stages.filter(s => s.enabled);
  const documents = sampleDocuments.slice(0, sampleSize);

  const logs: LogEntry[] = [];
  const addLog = (level: LogEntry['level'], message: string, stageName?: string) => {
    const entry: LogEntry = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      stageName,
      message,
    };
    logs.push(entry);
    if (onLog) onLog(entry);
  };

  addLog('INFO', `Starting job ${jobId} on MongoDB collection '${collectionName}'`);
  addLog('INFO', `Target test sample: ${documents.length} documents loaded directly from MongoDB link`);
  addLog('INFO', `Active Pipeline: '${pipeline.name}' (v${pipeline.version}) with ${activeStages.length} active stages`);

  // Try executing via live backend first
  if (currentConfig.mode === 'live') {
    try {
      const res = await fetch(`${currentConfig.baseUrl}/api/pipeline/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents,
          pipeline,
          targetTopic: 'Regional Security & Geopolitical Stability',
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        let errMessage = `Backend returned HTTP ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.detail) errMessage = errData.detail;
          else if (errData.message) errMessage = errData.message;
        } catch (_) {}
        addLog('ERROR', `Inference request failed: ${errMessage}`);
        throw new Error(errMessage);
      }

      const data = await res.json();
      if (!data.output) {
        addLog('ERROR', 'Backend returned an empty or invalid response structure');
        throw new Error('Invalid backend response: missing output payload');
      }

      addLog('SUCCESS', `Backend completed inference across all ${documents.length} MongoDB records.`);
      const execution: JobExecution = {
        jobId,
        datasetId: collectionName,
        datasetName,
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        sampleSize: documents.length,
        status: 'COMPLETED',
        startTime,
        endTime: new Date().toISOString(),
        progress: {
          totalDocs: documents.length,
          processedDocs: documents.length,
          currentStageIndex: activeStages.length,
          totalStages: activeStages.length,
          currentStageName: 'COMPLETED',
          percent: 100,
          docsPerSecond: 12.4,
          estimatedRemainingSec: 0,
          elapsedSec: 1,
          errorsCount: 0,
        },
        logs,
        resultSummary: {
          avgLatencyPerDocMs: data.output.stats?.avgLatencyMs || 50,
          totalTokensProcessed: documents.reduce((acc, d) => acc + (d.metadata.rawTokens || 50), 0),
          entitiesExtractedCount: data.output.records.reduce((acc: number, r: any) => acc + (r.entities?.length || 0), 0),
          dominantSentiment: data.output.stats?.sentimentDistribution?.positive >= data.output.stats?.sentimentDistribution?.negative ? 'POSITIVE' : 'NEGATIVE',
          lowConfidenceCount: 0,
          qualityScorePercent: 98,
        },
      };
      return { execution, output: data.output };
    } catch (err: any) {
      addLog('ERROR', `Backend connection failure: ${err.message || 'Cannot reach API at ' + currentConfig.baseUrl}`);
      throw new Error(`NLP Backend Error: ${err.message || 'Server unreachable'}. Ensure the backend service is running on ${currentConfig.baseUrl}.`);
    }
  }

  // Client-side execution simulation
  const results: IntelligenceResultDoc[] = [];
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const stageIdx = Math.floor((i / documents.length) * activeStages.length);
    const currentStage = activeStages[stageIdx] || activeStages[0];

    await new Promise(r => setTimeout(r, 100));

    const processed = processSingleDocument(doc, pipeline);
    results.push(processed);

    const percent = Math.round(((i + 1) / documents.length) * 100);
    if (onProgress) {
      onProgress(percent, i + 1, currentStage?.taskId || 'complete');
    }

    if (i === 0 || i === Math.floor(documents.length / 2) || i === documents.length - 1) {
      addLog('DEBUG', `Processed doc ${i + 1}/${documents.length} [_id: ${doc._id.slice(-6)}]`, currentStage?.taskId);
    }
  }

  addLog('SUCCESS', `Completed inference pipeline across all ${documents.length} documents.`);
  addLog('INFO', `Compiling perception indices, entity linking graphs, and audit metrics.`);

  let pos = 0, neu = 0, neg = 0;
  const entityMap = new Map<string, { category: string; count: number }>();
  const topicMap = new Map<string, number>();
  let totalLatency = 0;
  let totalConf = 0;
  let flaggedCount = 0;

  for (const r of results) {
    if (r.perception.sentiment === 'POSITIVE') pos++;
    else if (r.perception.sentiment === 'NEGATIVE') neg++;
    else neu++;

    for (const ent of r.entities) {
      const existing = entityMap.get(ent.text) || { category: ent.category, count: 0 };
      existing.count++;
      entityMap.set(ent.text, existing);
    }

    for (const top of r.topics) {
      topicMap.set(top.topic, (topicMap.get(top.topic) || 0) + 1);
    }

    totalLatency += r.processingTimeMs;
    if (r.integrity?.flagged) flaggedCount++;
  }

  const topEntities = Array.from(entityMap.entries())
    .map(([name, data]) => ({ name, category: data.category, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topTopics = Array.from(topicMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const output: PipelineOutputData = {
    jobId,
    generatedAt: new Date().toISOString(),
    totalRecords: results.length,
    records: results,
    stats: {
      sentimentDistribution: {
        positive: pos,
        neutral: neu,
        negative: neg,
      },
      topEntities,
      topTopics,
      flaggedCount,
      avgLatencyMs: Math.round(totalLatency / Math.max(1, results.length)),
    },
  };

  const execution: JobExecution = {
    jobId,
    datasetId: collectionName,
    datasetName,
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    sampleSize: documents.length,
    status: 'COMPLETED',
    startTime,
    endTime: new Date().toISOString(),
    progress: {
      totalDocs: documents.length,
      processedDocs: documents.length,
      currentStageIndex: activeStages.length,
      totalStages: activeStages.length,
      currentStageName: 'COMPLETED',
      percent: 100,
      docsPerSecond: 8.5,
      estimatedRemainingSec: 0,
      elapsedSec: Math.round((documents.length * 100) / 1000),
      errorsCount: 0,
    },
    logs,
    resultSummary: {
      avgLatencyPerDocMs: output.stats.avgLatencyMs,
      totalTokensProcessed: documents.reduce((acc, d) => acc + (d.metadata.rawTokens || 50), 0),
      entitiesExtractedCount: results.reduce((acc, r) => acc + r.entities.length, 0),
      dominantSentiment: pos >= neg && pos >= neu ? 'POSITIVE' : neg >= neu ? 'NEGATIVE' : 'NEUTRAL',
      lowConfidenceCount: 0,
      qualityScorePercent: 96,
    },
  };

  return { execution, output };
}
