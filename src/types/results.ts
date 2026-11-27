import { MongoDocument } from './dataset';

export interface ExtractedEntity {
  text: string;
  label: string; // 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'PRODUCT' | 'EVENT' | string
  source_label: string; // Original model label (e.g. 'GPE', 'LOC', 'ORG', etc.)
  start: number;
  end: number;
  category?: string; // Backward compatibility alias matching label
}

export interface VaderSentiment {
  pos: number;
  neg: number;
  neu: number;
  compound: number;
  label: 'positive' | 'negative' | 'neutral';
}

export interface PerceptionResult {
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  polarityScore: number; // -1.0 to 1.0 (VADER compound)
  subjectivityScore: number; // 0.0 to 1.0 (1.0 - neu)
  vader: VaderSentiment;
  emotions?: {
    anger: number;
    fear: number;
    trust?: number;
    joy: number;
    sadness: number;
    surprise: number;
    disgust?: number;
  };
}

export interface ExtractiveSummaryBullet {
  sentence_idx: number;
  text: string;
  start: number;
  end: number;
}

export interface ExtractiveSummary {
  type: 'extractive';
  bulletPoints: string[];
  bulletsWithTraceability: ExtractiveSummaryBullet[];
  tldr: string;
}

export interface IntelligenceResultDoc {
  docId: string;
  originalDoc: MongoDocument;
  cleanedText: string;
  language: string;
  entities: ExtractedEntity[];
  perception: PerceptionResult;
  topics?: {
    topic: string;
    confidence: number;
  }[];
  domain?: {
    task?: string;
    domain: string;
    score: number;
    all_scores?: Record<string, number>;
    candidates?: Record<string, number>;
    below_threshold?: boolean;
    method?: string;
    model?: string;
  };
  category?: {
    category: string;
    parent_domain: string;
    score: number;
    candidates?: Record<string, number>;
  };
  keyphrases: {
    phrase: string;
    score?: number;
  }[];
  summary: ExtractiveSummary;
  integrity?: {
    toxicityScore: number;
    propagandaProbability: number;
    flagged: boolean;
  };
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
  modelsUsed?: Record<string, string>;
  stats: {
    sentimentDistribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    domainDistribution?: Record<string, number>;
    topEntities: { name: string; category: string; count: number }[];
    topTopics: { name: string; count: number }[];
    flaggedCount: number;
    avgLatencyMs: number;
  };
}
