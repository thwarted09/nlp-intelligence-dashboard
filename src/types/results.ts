import { MongoDocument } from './dataset';

export interface ExtractedEntity {
  text: string;
  category: 'PERSON' | 'ORG' | 'GPE' | 'NORP' | 'EVENT' | 'PRODUCT' | 'DATE' | 'FACILITY' | 'THREAT_ACTOR';
  start: number;
  end: number;
  confidence: number;
  salience?: number;
}

export interface PerceptionResult {
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  polarityScore: number; // -1.0 to 1.0
  subjectivityScore: number; // 0.0 to 1.0
  stance: {
    target: string;
    label: 'SUPPORT' | 'OPPOSE' | 'NEUTRAL';
    confidence: number;
  };
  emotions: {
    anger: number;
    fear: number;
    trust: number;
    joy: number;
    sadness: number;
    surprise: number;
  };
}

export interface IntelligenceResultDoc {
  docId: string;
  originalDoc: MongoDocument;
  cleanedText: string;
  language: string;
  entities: ExtractedEntity[];
  perception: PerceptionResult;
  topics: {
    topic: string;
    confidence: number;
  }[];
  keyphrases: {
    phrase: string;
    score: number;
  }[];
  summary: {
    bulletPoints: string[];
    tldr: string;
  };
  integrity: {
    toxicityScore: number; // 0 to 1
    propagandaProbability: number; // 0 to 1
    flagged: boolean;
  };
  overallConfidence: number;
  processingTimeMs: number;
  humanValidation?: {
    status: 'pending' | 'verified' | 'flagged' | 'corrected';
    notes?: string;
    validatedAt?: string;
    correctedSentiment?: string;
  };
}

export interface PipelineOutputData {
  jobId: string;
  generatedAt: string;
  totalRecords: number;
  records: IntelligenceResultDoc[];
  stats: {
    sentimentDistribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    topEntities: { name: string; category: string; count: number }[];
    topTopics: { name: string; count: number }[];
    avgConfidence: number;
    flaggedCount: number;
    avgLatencyMs: number;
  };
}
