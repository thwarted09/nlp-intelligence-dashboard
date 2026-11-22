export type NLPTaskId =
  | 'ner'
  | 'sentiment_perception'
  | 'stance_detection'
  | 'emotion_analysis'
  | 'narrative_classification'
  | 'keyphrase_extraction'
  | 'summarization'
  | 'toxicity_propaganda'
  | 'language_normalization';

export interface NLPTaskDefinition {
  id: NLPTaskId;
  name: string;
  category: 'Entity & Extraction' | 'Perception & Stance' | 'Classification & Topics' | 'Summarization & Synthesis' | 'Safety & Quality';
  description: string;
  badge: string;
  icon: string;
  defaultModel: string;
  availableModels: {
    id: string;
    name: string;
    provider: 'HuggingFace' | 'spaCy' | 'Local-ONNX' | 'OpenAI-Compatible' | 'FastText';
    latencyMs: number;
    recommended: boolean;
  }[];
  defaultParams: Record<string, any>;
  paramSchema: {
    key: string;
    label: string;
    type: 'slider' | 'select' | 'boolean' | 'text' | 'number';
    min?: number;
    max?: number;
    step?: number;
    options?: { label: string; value: any }[];
    default: any;
    description: string;
  }[];
}

export interface PipelineStageConfig {
  stageId: string;
  taskId: NLPTaskId;
  enabled: boolean;
  selectedModel: string;
  parameters: Record<string, any>;
  executionOrder: number;
}

export interface PipelineWorkflow {
  id: string;
  name: string;
  description: string;
  version: string;
  stages: PipelineStageConfig[];
  createdAt: string;
  updatedAt: string;
}
