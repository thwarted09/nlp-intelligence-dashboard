import React, { useState, useEffect } from 'react';
import { 
  DatasetFilter, 
  MongoDocument, 
  DatabaseSummary, 
  CollectionSummary 
} from './types/dataset';
import { PipelineWorkflow } from './types/nlp';
import { JobExecution, LogEntry } from './types/job';
import { PipelineOutputData } from './types/results';
import { MOCK_DATASETS } from './data/mockDatasets';
import { PREDEFINED_PIPELINES } from './data/predefinedPipelines';
import { 
  connectMongoByUri, 
  fetchCollectionsForDb, 
  queryLiveMongoDocuments, 
  executePipelineJob 
} from './services/api';

// Components
import { Navbar, ActiveTab } from './components/common/Navbar';
import { DatasetSelector } from './components/dataset/DatasetSelector';
import { FilterPanel } from './components/dataset/FilterPanel';
import { DataTableView } from './components/dataset/DataTableView';
import { NlpStagingBar } from './components/dataset/NlpStagingBar';
import { DocumentJsonViewer } from './components/dataset/DocumentJsonViewer';
import { PipelineBuilder } from './components/pipeline/PipelineBuilder';
import { JobRunnerPanel } from './components/execution/JobRunnerPanel';
import { ResultsDashboard } from './components/results/ResultsDashboard';
import { SingleTextTester } from './components/playground/SingleTextTester';
import { BackendConnectorModal } from './components/backendGuide/BackendConnectorModal';

export const App: React.FC = () => {
  // Navigation & Config Modals
  const [activeTab, setActiveTab] = useState<ActiveTab>('dataset');
  const [isBackendModalOpen, setIsBackendModalOpen] = useState(false);

  // MongoDB Dynamic Link Connection State
  const [mongoUri, setMongoUri] = useState<string>('mongodb://localhost:27017');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [databases, setDatabases] = useState<DatabaseSummary[]>([]);
  const [activeDatabase, setActiveDatabase] = useState<string>('intel_vault_prod');
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('intel_osint_geopolitics');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  // Dataset / Sampling State (Slice to extract for filtration)
  const [sampleSize, setSampleSize] = useState<number>(10);
  const [samplingMethod, setSamplingMethod] = useState<'random' | 'first_n' | 'stratified' | 'recent'>('random');
  const [filter, setFilter] = useState<DatasetFilter>({
    searchQuery: '',
    sourceTypes: [],
    languages: [],
    regions: [],
    dateFrom: '',
    dateTo: '',
    sampleSize: 10,
    samplingMethod: 'random',
    textField: 'auto',
  });

  const [currentDocuments, setCurrentDocuments] = useState<MongoDocument[]>(MOCK_DATASETS[0].sampleData);
  const [totalInCollection, setTotalInCollection] = useState<number>(MOCK_DATASETS[0].totalRecords);
  const [inspectedDoc, setInspectedDoc] = useState<MongoDocument | null>(null);

  // NLP Activity Staging / Selection State (Which documents to take for NLP, not the whole file)
  const [selectedForNlpIds, setSelectedForNlpIds] = useState<string[]>(
    MOCK_DATASETS[0].sampleData.slice(0, 5).map(d => d._id)
  );
  const [showOnlySelected, setShowOnlySelected] = useState<boolean>(false);

  // Pipeline State
  const [activePipeline, setActivePipeline] = useState<PipelineWorkflow>(PREDEFINED_PIPELINES[0]);

  // Execution & Job State
  const [jobRunning, setJobRunning] = useState<boolean>(false);
  const [currentJob, setCurrentJob] = useState<JobExecution>({
    jobId: 'job-init-001',
    datasetId: selectedCollection,
    datasetName: selectedCollection,
    pipelineId: activePipeline.id,
    pipelineName: activePipeline.name,
    sampleSize: 5,
    status: 'IDLE',
    startTime: new Date().toISOString(),
    progress: {
      totalDocs: 5,
      processedDocs: 0,
      currentStageIndex: 0,
      totalStages: activePipeline.stages.filter(s => s.enabled).length,
      currentStageName: 'Ready',
      percent: 0,
      docsPerSecond: 0,
      estimatedRemainingSec: 0,
      elapsedSec: 0,
      errorsCount: 0,
    },
    logs: [
      {
        id: 'log-0',
        timestamp: new Date().toLocaleTimeString(),
        level: 'INFO',
        message: 'IntelNLP Studio initialized with MongoDB Dynamic Link Connector.',
      },
    ],
  });

  const [resultsData, setResultsData] = useState<PipelineOutputData | null>(null);

  // Connect to MongoDB via URI
  const handleConnectMongo = async (uri: string): Promise<boolean> => {
    setIsConnecting(true);
    setConnectionError(null);

    const result = await connectMongoByUri(uri);
    setIsConnecting(false);

    if (result.ok) {
      setIsConnected(true);
      setIsDemoMode(false);
      setDatabases(result.databases);
      const targetDb = result.defaultDatabase || (result.databases[0]?.name ?? 'test');
      setActiveDatabase(targetDb);

      const colls = await fetchCollectionsForDb(uri, targetDb);
      setCollections(colls);

      if (colls.length > 0) {
        const firstColl = colls[0].name;
        setSelectedCollection(firstColl);
        loadCollectionDocuments(uri, targetDb, firstColl, sampleSize, samplingMethod, filter.searchQuery);
      }

      setCurrentJob(prev => ({
        ...prev,
        logs: [
          ...prev.logs,
          {
            id: 'log-' + Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            level: 'SUCCESS',
            message: `Connected to MongoDB link. Found ${result.databases.length} databases in cluster.`,
          },
        ],
      }));
      return true;
    } else {
      setIsConnected(false);
      setConnectionError(result.message);
      return false;
    }
  };

  const handleSelectDatabase = async (dbName: string) => {
    setActiveDatabase(dbName);
    const colls = await fetchCollectionsForDb(mongoUri, dbName);
    setCollections(colls);
    if (colls.length > 0) {
      const firstColl = colls[0].name;
      setSelectedCollection(firstColl);
      loadCollectionDocuments(mongoUri, dbName, firstColl, sampleSize, samplingMethod, filter.searchQuery);
    }
  };

  const handleSelectCollection = (collName: string) => {
    setSelectedCollection(collName);

    if (isDemoMode) {
      const ds = MOCK_DATASETS.find(d => d.collectionName === collName) || MOCK_DATASETS[0];
      const docs = ds.sampleData.slice(0, sampleSize);
      setCurrentDocuments(docs);
      setTotalInCollection(ds.totalRecords);
      // Default select first few for NLP activity
      setSelectedForNlpIds(docs.slice(0, Math.min(5, docs.length)).map(d => d._id));
    } else {
      loadCollectionDocuments(mongoUri, activeDatabase, collName, sampleSize, samplingMethod, filter.searchQuery);
    }
  };

  const loadCollectionDocuments = async (
    uri: string,
    database: string,
    collection: string,
    size: number,
    method: 'random' | 'first_n' | 'stratified' | 'recent',
    search: string
  ) => {
    const res = await queryLiveMongoDocuments(uri, database, collection, size, method, search);
    setCurrentDocuments(res.documents);
    setTotalInCollection(res.totalInCollection);
    // Auto-select first few by default for convenience
    if (res.documents.length > 0) {
      setSelectedForNlpIds(res.documents.slice(0, Math.min(5, res.documents.length)).map(d => d._id));
    } else {
      setSelectedForNlpIds([]);
    }
  };

  useEffect(() => {
    if (!isDemoMode && isConnected && selectedCollection) {
      loadCollectionDocuments(mongoUri, activeDatabase, selectedCollection, sampleSize, samplingMethod, filter.searchQuery);
    } else if (isDemoMode) {
      const ds = MOCK_DATASETS.find(d => d.collectionName === selectedCollection) || MOCK_DATASETS[0];
      let filtered = [...ds.sampleData];
      if (filter.searchQuery.trim()) {
        const q = filter.searchQuery.toLowerCase();
        filtered = filtered.filter(d => d.text.toLowerCase().includes(q) || (d.title && d.title.toLowerCase().includes(q)));
      }
      const sliced = filtered.slice(0, sampleSize);
      setCurrentDocuments(sliced);
      setTotalInCollection(ds.totalRecords);
    }
  }, [sampleSize, samplingMethod, filter.searchQuery, isDemoMode, selectedCollection]);

  // Selection handlers
  const handleToggleDocSelect = (docId: string) => {
    setSelectedForNlpIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAllVisible = () => {
    setSelectedForNlpIds(currentFilteredDocs.map(d => d._id));
  };

  const handleDeselectAll = () => {
    setSelectedForNlpIds([]);
  };

  const handleSelectTopN = (n: number) => {
    setSelectedForNlpIds(currentFilteredDocs.slice(0, n).map(d => d._id));
  };

  // Filter visible documents
  const currentFilteredDocs = currentDocuments.filter(d => {
    if (filter.sourceTypes.length > 0 && !filter.sourceTypes.includes(d.sourceType)) {
      return false;
    }
    return true;
  });

  const displayedDocs = showOnlySelected
    ? currentFilteredDocs.filter(d => selectedForNlpIds.includes(d._id))
    : currentFilteredDocs;

  // The curated documents staged specifically for NLP activity
  const documentsStagedForNlp = currentDocuments.filter(d => selectedForNlpIds.includes(d._id));

  // Run NLP Pipeline Job on ONLY the chosen documents
  const handleRunJob = async () => {
    if (jobRunning) return;

    // Use ONLY documents chosen for NLP activity
    const targetDocs = documentsStagedForNlp.length > 0 ? documentsStagedForNlp : currentDocuments.slice(0, 1);
    if (targetDocs.length === 0) return;

    setJobRunning(true);
    setActiveTab('execution');

    setCurrentJob(prev => ({
      ...prev,
      datasetId: selectedCollection,
      datasetName: `${activeDatabase}.${selectedCollection}`,
      status: 'RUNNING',
      startTime: new Date().toISOString(),
      sampleSize: targetDocs.length,
      progress: {
        ...prev.progress,
        totalDocs: targetDocs.length,
        processedDocs: 0,
        percent: 0,
        currentStageName: 'Initializing Pipeline Stages...',
        elapsedSec: 0,
      },
      logs: [
        ...prev.logs,
        {
          id: 'log-' + Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          level: 'INFO',
          message: `Running NLP evaluation on ${targetDocs.length} curated documents chosen from '${selectedCollection}' (not whole file)...`,
        },
      ],
    }));

    try {
      const { execution, output } = await executePipelineJob(
        selectedCollection,
        `${activeDatabase}.${selectedCollection}`,
        activePipeline,
        targetDocs,
        targetDocs.length,
        (percent, currentDoc, stageName) => {
          setCurrentJob(prev => ({
            ...prev,
            progress: {
              ...prev.progress,
              percent,
              processedDocs: currentDoc,
              currentStageName: stageName,
              elapsedSec: Math.max(1, Math.round((currentDoc * 100) / 1000)),
              docsPerSecond: 10.2,
            },
          }));
        },
        (logEntry: LogEntry) => {
          setCurrentJob(prev => ({
            ...prev,
            logs: [...prev.logs, logEntry],
          }));
        }
      );

      setCurrentJob(execution);
      setResultsData(output);
      setJobRunning(false);
    } catch (err: any) {
      console.error('Job execution error', err);
      setJobRunning(false);
      setCurrentJob(prev => ({
        ...prev,
        status: 'FAILED',
        logs: [
          ...prev.logs,
          {
            id: 'log-' + Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            level: 'ERROR',
            message: `Pipeline execution failed: ${err.message || 'Unknown error'}`,
          },
        ],
      }));
    }
  };

  const availableSourceTypes = Array.from(
    new Set(currentDocuments.map(d => d.sourceType || 'news'))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Global Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        datasetName={isDemoMode ? `Demo: ${selectedCollection} (${documentsStagedForNlp.length} staged for NLP)` : `MongoDB: ${activeDatabase}.${selectedCollection} (${documentsStagedForNlp.length} staged for NLP)`}
        totalRecords={totalInCollection}
        isBackendLive={isConnected}
        onOpenBackendConfig={() => setIsBackendModalOpen(true)}
        jobRunning={jobRunning}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab 1: Dataset & Inspection */}
        {activeTab === 'dataset' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Step 1: Choose Dataset & Collection to Extract from MongoDB */}
            <DatasetSelector
              mongoUri={mongoUri}
              onMongoUriChange={setMongoUri}
              onConnectMongo={handleConnectMongo}
              isConnecting={isConnecting}
              isConnected={isConnected}
              connectionError={connectionError}
              databases={databases}
              activeDatabase={activeDatabase}
              onSelectDatabase={handleSelectDatabase}
              collections={collections}
              selectedCollection={selectedCollection}
              onSelectCollection={handleSelectCollection}
              sampleSize={sampleSize}
              onSampleSizeChange={setSampleSize}
              samplingMethod={samplingMethod}
              onSamplingMethodChange={setSamplingMethod}
              demoDatasets={MOCK_DATASETS}
              isDemoMode={isDemoMode}
              onToggleDemoMode={(val) => {
                setIsDemoMode(val);
                if (val) {
                  setSelectedCollection(MOCK_DATASETS[0].collectionName);
                  const docs = MOCK_DATASETS[0].sampleData.slice(0, sampleSize);
                  setCurrentDocuments(docs);
                  setTotalInCollection(MOCK_DATASETS[0].totalRecords);
                  setSelectedForNlpIds(docs.slice(0, Math.min(5, docs.length)).map(d => d._id));
                }
              }}
            />

            {/* Step 2: Filtration & Inspection Controls */}
            <FilterPanel
              filter={filter}
              onFilterChange={setFilter}
              availableSourceTypes={availableSourceTypes}
              totalAvailable={totalInCollection}
              totalFiltered={currentFilteredDocs.length}
            />

            {/* Step 3: Choose Which Documents To Take For NLP Activity (Not The Whole File) */}
            <NlpStagingBar
              totalLoaded={currentFilteredDocs.length}
              selectedCount={selectedForNlpIds.length}
              onSelectAll={handleSelectAllVisible}
              onDeselectAll={handleDeselectAll}
              onSelectTopN={handleSelectTopN}
              showOnlySelected={showOnlySelected}
              onToggleShowOnlySelected={() => setShowOnlySelected(!showOnlySelected)}
              onProceedToPipeline={() => setActiveTab('pipeline')}
              datasetName={selectedCollection}
            />

            {/* Data Inspection Table with Checkbox Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Inspecting Extracted Records: <span className="text-cyan-400 font-mono">{selectedCollection}</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  Select rows using checkboxes to take forward for NLP activity
                </span>
              </div>

              <DataTableView
                documents={displayedDocs}
                onInspectDoc={setInspectedDoc}
                selectedDocIds={selectedForNlpIds}
                onToggleDocSelect={handleToggleDocSelect}
                onSelectAll={handleSelectAllVisible}
                onDeselectAll={handleDeselectAll}
              />
            </div>
          </div>
        )}

        {/* Tab 2: NLP Pipeline Builder */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <PipelineBuilder
              pipeline={activePipeline}
              onPipelineChange={setActivePipeline}
              datasetName={`${activeDatabase}.${selectedCollection}`}
              sampleSize={sampleSize}
              stagedDocumentsCount={documentsStagedForNlp.length}
              onBackToSelection={() => setActiveTab('dataset')}
            />

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('dataset')}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
              >
                ← Back to Choose Records
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('execution')}
                className="flex items-center space-x-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 shadow-md transition-all"
              >
                <span>Proceed to 3. Run & Execute Job on {documentsStagedForNlp.length} Chosen Docs</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Execution & Logs */}
        {activeTab === 'execution' && (
          <div className="animate-in fade-in duration-200">
            <JobRunnerPanel
              dataset={{
                id: selectedCollection,
                name: `${activeDatabase}.${selectedCollection}`,
                collectionName: selectedCollection,
                database: activeDatabase,
                description: `Live MongoDB Collection: ${activeDatabase}.${selectedCollection}`,
                totalRecords: totalInCollection,
                sizeBytes: totalInCollection * 1500,
                lastUpdated: new Date().toISOString(),
                category: 'Live MongoDB',
                tags: ['MongoDB', 'Live Intercepts'],
                sampleData: documentsStagedForNlp,
              }}
              pipeline={activePipeline}
              sampleSize={documentsStagedForNlp.length}
              stagedCount={documentsStagedForNlp.length}
              job={currentJob}
              isRunning={jobRunning}
              onRunJob={handleRunJob}
              onViewResults={() => setActiveTab('results')}
            />
          </div>
        )}

        {/* Tab 4: Results & Validation */}
        {activeTab === 'results' && (
          <div className="animate-in fade-in duration-200">
            <ResultsDashboard
              data={resultsData}
              datasetName={`${activeDatabase}.${selectedCollection}`}
              pipelineName={activePipeline.name}
            />
          </div>
        )}

        {/* Tab 5: Single-Text Sandbox */}
        {activeTab === 'playground' && (
          <div className="animate-in fade-in duration-200">
            <SingleTextTester pipeline={activePipeline} />
          </div>
        )}

        {/* Tab 6: Backend Connector Guide */}
        {activeTab === 'backend-guide' && (
          <div className="animate-in fade-in duration-200">
            <BackendConnectorModal
              isOpen={true}
              onClose={() => setActiveTab('dataset')}
              onConfigUpdated={() => {}}
            />
          </div>
        )}
      </main>

      {/* Raw MongoDB Document Inspector Modal */}
      {inspectedDoc && (
        <DocumentJsonViewer
          document={inspectedDoc}
          onClose={() => setInspectedDoc(null)}
        />
      )}

      {/* Backend Settings Dialog */}
      {isBackendModalOpen && (
        <BackendConnectorModal
          isOpen={isBackendModalOpen}
          onClose={() => setIsBackendModalOpen(false)}
          onConfigUpdated={() => {}}
        />
      )}
    </div>
  );
};
