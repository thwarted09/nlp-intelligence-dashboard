export type JobStatus = 'IDLE' | 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  stageName?: string;
  message: string;
  recordIndex?: number;
  docId?: string;
  details?: any;
}

export interface JobProgress {
  totalDocs: number;
  processedDocs: number;
  currentStageIndex: number;
  totalStages: number;
  currentStageName: string;
  percent: number;
  docsPerSecond: number;
  estimatedRemainingSec: number;
  elapsedSec: number;
  errorsCount: number;
}

export interface JobExecution {
  jobId: string;
  datasetId: string;
  datasetName: string;
  pipelineId: string;
  pipelineName: string;
  sampleSize: number;
  status: JobStatus;
  startTime: string;
  endTime?: string;
  progress: JobProgress;
  logs: LogEntry[];
  resultSummary?: {
    avgLatencyPerDocMs: number;
    totalTokensProcessed: number;
    entitiesExtractedCount: number;
    dominantSentiment: string;
    lowConfidenceCount: number;
    qualityScorePercent: number;
  };
}
