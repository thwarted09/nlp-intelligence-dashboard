export interface MongoDocument {
  _id: string;
  source: string;
  sourceType: string;
  timestamp: string;
  author?: string;
  title?: string;
  text: string;
  language: string;
  url?: string;
  rawMongo?: Record<string, any>;
  metadata: {
    engagementCount?: number;
    shares?: number;
    region?: string;
    targetTopic?: string;
    rawTokens?: number;
    channel?: string;
    verified?: boolean;
    collection?: string;
    database?: string;
    [key: string]: any;
  };
}

export interface CollectionSummary {
  name: string;
  documentCount: number;
  detectedTextField: string;
  fields: string[];
  sizeBytes: number;
}

export interface DatabaseSummary {
  name: string;
  collectionsCount: number;
  isSystem: boolean;
}

export interface MongoConnectionState {
  uri: string;
  connected: boolean;
  activeDatabase: string;
  availableDatabases: DatabaseSummary[];
  availableCollections: CollectionSummary[];
  selectedCollection: string;
}

export interface DatasetInfo {
  id: string;
  name: string;
  collectionName: string;
  description: string;
  database: string;
  totalRecords: number;
  sizeBytes: number;
  lastUpdated: string;
  category: 'OSINT' | 'Brand Perception' | 'Geopolitics' | 'Cyber Threats' | 'Crisis Response' | 'Live MongoDB';
  tags: string[];
  sampleData: MongoDocument[];
}

export interface DatasetFilter {
  searchQuery: string;
  sourceTypes: string[];
  languages: string[];
  regions: string[];
  dateFrom: string;
  dateTo: string;
  sampleSize: number;
  samplingMethod: 'random' | 'first_n' | 'stratified' | 'recent';
  textField?: string;
}
