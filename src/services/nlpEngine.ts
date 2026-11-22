import { MongoDocument } from '../types/dataset';
import { PipelineWorkflow } from '../types/nlp';
import { IntelligenceResultDoc, ExtractedEntity, PerceptionResult } from '../types/results';
import { LogEntry } from '../types/job';

// Heuristic entity database for realistic extraction
const KNOWN_ENTITIES: { text: string; category: ExtractedEntity['category'] }[] = [
  { text: 'United States', category: 'GPE' },
  { text: 'US Indo-Pacific Command', category: 'ORG' },
  { text: 'Japan', category: 'GPE' },
  { text: 'South Korea', category: 'GPE' },
  { text: 'Singapore', category: 'GPE' },
  { text: 'Malacca Strait', category: 'LOC' as any },
  { text: 'Lin Jian', category: 'PERSON' },
  { text: 'Eleni Vance', category: 'PERSON' },
  { text: 'Estonia', category: 'GPE' },
  { text: 'Finland', category: 'GPE' },
  { text: 'Gulf of Finland', category: 'LOC' as any },
  { text: 'NATO', category: 'ORG' },
  { text: 'Northwood', category: 'GPE' },
  { text: 'Hungary', category: 'GPE' },
  { text: 'Slovakia', category: 'GPE' },
  { text: 'Austria', category: 'GPE' },
  { text: 'SPP', category: 'ORG' },
  { text: 'Lloyds Market Association', category: 'ORG' },
  { text: 'Bab-el-Mandeb Strait', category: 'LOC' as any },
  { text: 'Djibouti', category: 'GPE' },
  { text: 'Sitiveni Rabuka', category: 'PERSON' },
  { text: 'Fiji', category: 'GPE' },
  { text: 'Australia', category: 'GPE' },
  { text: 'Kiruna', category: 'GPE' },
  { text: 'LKAB', category: 'ORG' },
  { text: 'EU AI Act', category: 'PRODUCT' },
  { text: 'TSMC', category: 'ORG' },
  { text: 'Taiwan Semiconductor', category: 'ORG' },
  { text: 'ETH Zurich', category: 'ORG' },
  { text: 'Lower Saxony', category: 'GPE' },
  { text: 'Berlin', category: 'GPE' },
  { text: 'Paris', category: 'GPE' },
  { text: 'Central Bank', category: 'ORG' },
  { text: 'EU DisinfoLab', category: 'ORG' },
  { text: 'Red Cross', category: 'ORG' },
];

export function extractEntitiesFromText(text: string, threshold = 0.75): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  
  // Find known entities
  for (const item of KNOWN_ENTITIES) {
    const regex = new RegExp(`\\b${item.text}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        category: item.category,
        start: match.index,
        end: match.index + match[0].length,
        confidence: Number((0.82 + Math.random() * 0.16).toFixed(2)),
        salience: Number((0.6 + Math.random() * 0.38).toFixed(2)),
      });
    }
  }

  // Find regex patterns for acronyms/caps organizations
  const orgRegex = /\b[A-Z]{3,6}\b/g;
  let orgMatch;
  while ((orgMatch = orgRegex.exec(text)) !== null) {
    if (!entities.some(e => e.start === orgMatch!.index)) {
      entities.push({
        text: orgMatch[0],
        category: 'ORG',
        start: orgMatch.index,
        end: orgMatch.index + orgMatch[0].length,
        confidence: Number((0.76 + Math.random() * 0.18).toFixed(2)),
        salience: 0.7,
      });
    }
  }

  return entities.filter(e => e.confidence >= threshold);
}

export function computePerception(text: string, title = ''): PerceptionResult {
  const combined = (title + ' ' + text).toLowerCase();
  
  let posWords = ['agreement', 'cooperation', 'stabilize', 'delighted', 'record', 'accord', 'validated', 'peace', 'bullish', 'expansion', 'resilience', 'cleared'];
  let negWords = ['threat', 'cautioning', 'anxious', 'leaked', 'urgent', 'panic', 'bypass', 'attack', 'blackout', 'casualty', 'disinfo', 'sabotage', 'hostile', 'fraud', 'freeze'];
  
  let posCount = posWords.filter(w => combined.includes(w)).length;
  let negCount = negWords.filter(w => combined.includes(w)).length;
  
  let score = 0;
  if (posCount + negCount > 0) {
    score = (posCount - negCount) / (posCount + negCount);
  } else {
    score = (Math.random() - 0.5) * 0.3;
  }
  
  score = Math.max(-1, Math.min(1, score + (Math.random() - 0.5) * 0.15));
  
  const sentiment = score > 0.18 ? 'POSITIVE' : score < -0.18 ? 'NEGATIVE' : 'NEUTRAL';
  const subjectivity = Number((0.25 + Math.abs(score) * 0.5 + Math.random() * 0.2).toFixed(2));
  
  // Stance
  const stanceLabel = score > 0.25 ? 'SUPPORT' : score < -0.2 ? 'OPPOSE' : 'NEUTRAL';
  
  // Emotion spectrum
  const isThreatOrPanic = combined.includes('urgent') || combined.includes('leak') || combined.includes('attack') || combined.includes('blackout');
  const isDefenseOrCooperation = combined.includes('accord') || combined.includes('agreement') || combined.includes('cooperation');
  
  const anger = isThreatOrPanic ? Number((0.45 + Math.random() * 0.4).toFixed(2)) : Number((0.05 + Math.random() * 0.2).toFixed(2));
  const fear = isThreatOrPanic ? Number((0.6 + Math.random() * 0.35).toFixed(2)) : Number((0.1 + Math.random() * 0.25).toFixed(2));
  const trust = isDefenseOrCooperation ? Number((0.65 + Math.random() * 0.3).toFixed(2)) : Number((0.2 + Math.random() * 0.3).toFixed(2));
  const joy = sentiment === 'POSITIVE' ? Number((0.4 + Math.random() * 0.4).toFixed(2)) : Number((0.05 + Math.random() * 0.15).toFixed(2));
  const sadness = combined.includes('casualty') || combined.includes('flood') ? 0.75 : Number((0.08 + Math.random() * 0.2).toFixed(2));
  const surprise = combined.includes('urgent') || combined.includes('leak') ? 0.8 : Number((0.15 + Math.random() * 0.25).toFixed(2));

  return {
    sentiment,
    polarityScore: Number(score.toFixed(3)),
    subjectivityScore: subjectivity,
    stance: {
      target: 'Regional Stability & Security Protocol',
      label: stanceLabel,
      confidence: Number((0.72 + Math.random() * 0.24).toFixed(2)),
    },
    emotions: { anger, fear, trust, joy, sadness, surprise },
  };
}

export function extractSummary(text: string, title = ''): { bulletPoints: string[]; tldr: string } {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
  
  let bulletPoints: string[] = [];
  if (sentences.length >= 3) {
    bulletPoints = [
      sentences[0].trim(),
      sentences[Math.floor(sentences.length / 2)].trim(),
      sentences[sentences.length - 1].trim(),
    ];
  } else if (sentences.length > 0) {
    bulletPoints = sentences.slice(0, 3);
  } else {
    bulletPoints = ['Key strategic developments reported in operational theatre.'];
  }

  const tldr = title ? `${title}: ${sentences[0] || text.slice(0, 100)}...` : sentences[0] || text.slice(0, 120);

  return {
    bulletPoints,
    tldr,
  };
}

export function processSingleDocument(
  doc: MongoDocument,
  pipeline: PipelineWorkflow
): IntelligenceResultDoc {
  const enabledTaskIds = new Set(pipeline.stages.filter(s => s.enabled).map(s => s.taskId));
  
  const entities = enabledTaskIds.has('ner')
    ? extractEntitiesFromText(doc.text, 0.7)
    : [];
  
  const perception = enabledTaskIds.has('sentiment_perception') || enabledTaskIds.has('emotion_analysis')
    ? computePerception(doc.text, doc.title)
    : {
        sentiment: 'NEUTRAL' as const,
        polarityScore: 0,
        subjectivityScore: 0.1,
        stance: { target: 'General', label: 'NEUTRAL' as const, confidence: 0.5 },
        emotions: { anger: 0.1, fear: 0.1, trust: 0.5, joy: 0.2, sadness: 0.1, surprise: 0.1 },
      };

  const summary = enabledTaskIds.has('summarization')
    ? extractSummary(doc.text, doc.title)
    : { bulletPoints: [], tldr: doc.text.slice(0, 100) };

  const isHighToxicity = doc.sourceType === 'telegram' || doc.text.toLowerCase().includes('leak') || doc.text.toLowerCase().includes('sabotage');
  const toxicityScore = isHighToxicity ? Number((0.65 + Math.random() * 0.28).toFixed(2)) : Number((0.04 + Math.random() * 0.15).toFixed(2));
  const propagandaProb = doc.metadata?.botLikelihoodScore || (isHighToxicity ? 0.82 : 0.08);

  const keyphrases = [
    { phrase: doc.metadata?.targetTopic || 'Geopolitical Strategy', score: 0.94 },
    { phrase: doc.source, score: 0.82 },
    { phrase: 'Maritime Corridor', score: 0.78 },
  ];

  const topics = [
    { topic: doc.metadata?.targetTopic || 'International Relations', confidence: 0.91 },
    { topic: doc.sourceType.toUpperCase(), confidence: 0.85 },
  ];

  const overallConfidence = Number((0.82 + Math.random() * 0.15).toFixed(2));
  const processingTimeMs = Math.floor(45 + Math.random() * 65);

  return {
    docId: doc._id,
    originalDoc: doc,
    cleanedText: doc.text.replace(/\s+/g, ' ').trim(),
    language: doc.language || 'en',
    entities,
    perception,
    topics,
    keyphrases,
    summary,
    integrity: {
      toxicityScore,
      propagandaProbability: propagandaProb,
      flagged: toxicityScore > 0.6 || propagandaProb > 0.75,
    },
    overallConfidence,
    processingTimeMs,
    humanValidation: {
      status: overallConfidence < 0.85 ? 'flagged' : 'verified',
    },
  };
}

export function generateSimulationLogs(
  datasetName: string,
  sampleSize: number,
  pipeline: PipelineWorkflow
): LogEntry[] {
  const logs: LogEntry[] = [];
  const now = new Date();
  
  const addLog = (level: LogEntry['level'], message: string, stageName?: string, offsetMs = 0) => {
    const t = new Date(now.getTime() + offsetMs);
    logs.push({
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      timestamp: t.toISOString().split('T')[1].slice(0, 8),
      level,
      stageName,
      message,
    });
  };

  addLog('INFO', `Initializing NLP Execution Engine v2.4.0...`, undefined, 0);
  addLog('INFO', `Loaded dataset '${datasetName}' | Target test sample size: ${sampleSize} records`, undefined, 50);
  addLog('INFO', `Validating pipeline '${pipeline.name}' (${pipeline.stages.filter(s => s.enabled).length} active stages)...`, undefined, 100);

  let offset = 150;
  for (const stage of pipeline.stages.filter(s => s.enabled)) {
    addLog('DEBUG', `[Stage ${stage.executionOrder}] Warming up model runtime: ${stage.selectedModel}`, stage.taskId, offset);
    offset += 80;
    addLog('INFO', `[Stage ${stage.executionOrder}] Executing ${stage.taskId} across ${sampleSize} test documents...`, stage.taskId, offset);
    offset += 120;
    addLog('SUCCESS', `[Stage ${stage.executionOrder}] Batch inference completed. Loss: 0.012, 100% throughput ok`, stage.taskId, offset);
    offset += 90;
  }

  addLog('INFO', `Aggregating entity graphs, perception distributions, and intelligence summaries...`, undefined, offset);
  offset += 100;
  addLog('SUCCESS', `NLP job execution finished successfully. Results ready for inspection & validation.`, undefined, offset);

  return logs;
}
