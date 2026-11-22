import React, { useState } from 'react';
import { CollectionSummary, DatabaseSummary, DatasetInfo } from '../../types/dataset';
import { 
  Database, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Sliders, 
  HardDrive, 
  RefreshCw, 
  Zap,
  Server
} from 'lucide-react';

interface DatasetSelectorProps {
  mongoUri: string;
  onMongoUriChange: (uri: string) => void;
  onConnectMongo: (uri: string) => Promise<boolean>;
  isConnecting: boolean;
  isConnected: boolean;
  connectionError: string | null;
  databases: DatabaseSummary[];
  activeDatabase: string;
  onSelectDatabase: (dbName: string) => void;
  collections: CollectionSummary[];
  selectedCollection: string;
  onSelectCollection: (collName: string) => void;
  sampleSize: number;
  onSampleSizeChange: (size: number) => void;
  samplingMethod: 'random' | 'first_n' | 'stratified' | 'recent';
  onSamplingMethodChange: (method: 'random' | 'first_n' | 'stratified' | 'recent') => void;
  // Fallback demo collections
  demoDatasets: DatasetInfo[];
  isDemoMode: boolean;
  onToggleDemoMode: (enabled: boolean) => void;
}

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  mongoUri,
  onMongoUriChange,
  onConnectMongo,
  isConnecting,
  isConnected,
  connectionError,
  databases = [],
  activeDatabase,
  onSelectDatabase,
  collections = [],
  selectedCollection,
  onSelectCollection,
  sampleSize,
  onSampleSizeChange,
  samplingMethod,
  onSamplingMethodChange,
  demoDatasets = [],
  isDemoMode,
  onToggleDemoMode,
}) => {
  const [inputUri, setInputUri] = useState(mongoUri || 'mongodb://localhost:27017');
  const samplePresets = [5, 10, 25, 50, 100, 250];

  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUri.trim()) return;
    onMongoUriChange(inputUri);
    await onConnectMongo(inputUri);
  };

  const setPresetUri = (preset: string) => {
    setInputUri(preset);
    onMongoUriChange(preset);
  };

  return (
    <div className="space-y-6">
      {/* MongoDB Connection Link Header Box */}
      <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-5 shadow-xl shadow-cyan-950/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                <LinkIcon className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                MongoDB Cluster Connector
              </h2>
              {isConnected ? (
                <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>CONNECTED TO MONGODB</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                  <Server className="h-3 w-3" />
                  <span>NOT CONNECTED</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Enter your MongoDB Connection String (URI) to load real databases and collections for NLP testing.
            </p>
          </div>

          {/* Quick preset links */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] text-slate-500 font-mono">Quick Link:</span>
            <button
              type="button"
              onClick={() => setPresetUri('mongodb://localhost:27017')}
              className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] font-mono text-cyan-400 hover:border-cyan-500/50 transition-colors"
            >
              Localhost (27017)
            </button>
            <button
              type="button"
              onClick={() => setPresetUri('mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority')}
              className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] font-mono text-amber-400 hover:border-amber-500/50 transition-colors"
            >
              Atlas URI Template
            </button>
            <button
              type="button"
              onClick={() => onToggleDemoMode(true)}
              className={`rounded-md border px-2.5 py-1 text-[11px] font-mono transition-colors ${
                isDemoMode
                  ? 'bg-purple-950 text-purple-300 border-purple-800'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              Sample OSINT DB
            </button>
          </div>
        </div>

        {/* MongoDB Link Input & Connect Button */}
        <form onSubmit={handleConnect} className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Database className="h-4 w-4 text-cyan-500" />
            </div>
            <input
              type="text"
              value={inputUri}
              onChange={e => setInputUri(e.target.value)}
              placeholder="e.g. mongodb+srv://username:password@cluster.mongodb.net/dbname or mongodb://localhost:27017"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/90 pl-9 pr-4 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={isConnecting || !inputUri.trim()}
            className="flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:brightness-110 disabled:opacity-50 transition-all w-full sm:w-auto shrink-0"
          >
            {isConnecting ? (
              <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
            ) : (
              <Zap className="h-4 w-4 text-slate-950 fill-current" />
            )}
            <span>{isConnecting ? 'Connecting...' : 'Connect & Fetch Databases'}</span>
          </button>
        </form>

        {/* Error message */}
        {connectionError && (
          <div className="mt-3 flex items-center space-x-2 rounded-lg bg-rose-950/50 border border-rose-800/80 px-3 py-2 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span className="font-mono">{connectionError}</span>
          </div>
        )}
      </div>

      {/* Database & Collections Browser */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-cyan-400" />
              <span>Select Ingested Dataset (Collection)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Pick the MongoDB collection holding the intelligence intercepts to test.
            </p>
          </div>

          {/* Database Selector Dropdown */}
          {(databases || []).length > 0 && !isDemoMode && (
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-400 font-mono">Active Database:</span>
              <select
                value={activeDatabase}
                onChange={e => onSelectDatabase(e.target.value)}
                className="bg-transparent text-cyan-300 font-mono font-bold focus:outline-none cursor-pointer"
              >
                {(databases || []).map(db => (
                  <option key={db.name} value={db.name} className="bg-slate-900 text-slate-200">
                    {db.name} ({db.collectionsCount} collections)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Collections Grid */}
        {isDemoMode ? (
          /* Demo Mode Collections */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {(demoDatasets || []).map(ds => {
              const isSelected = selectedCollection === ds.collectionName;
              return (
                <div
                  key={ds.id}
                  onClick={() => onSelectCollection(ds.collectionName)}
                  className={`relative cursor-pointer rounded-xl p-4 transition-all border ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-800/40">
                      {ds.category}
                    </span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-cyan-400" />}
                  </div>
                  <h4 className="mt-2 text-sm font-semibold text-slate-100 line-clamp-1">{ds.name}</h4>
                  <p className="mt-1 text-xs text-slate-400 font-mono">{ds.collectionName}</p>
                  <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">{ds.description}</p>
                  <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{(ds.totalRecords || 0).toLocaleString()} docs</span>
                    <span>{((ds.sizeBytes || 0) / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (collections || []).length > 0 ? (
          /* Live MongoDB Collections */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(collections || []).map(coll => {
              const isSelected = selectedCollection === coll.name;
              return (
                <div
                  key={coll.name}
                  onClick={() => onSelectCollection(coll.name)}
                  className={`relative cursor-pointer rounded-xl p-4 transition-all border ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/40 font-mono">
                      LIVE COLLECTION
                    </span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-cyan-400" />}
                  </div>

                  <h4 className="mt-2 text-sm font-bold text-slate-100 font-mono truncate">
                    {coll.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Text Field: <span className="text-cyan-300">{coll.detectedTextField || 'text'}</span>
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {(coll.fields || []).slice(0, 5).map(f => (
                      <span key={f} className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {f}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center space-x-1">
                      <Layers className="h-3 w-3 text-cyan-500" />
                      <span>{(coll.documentCount || 0).toLocaleString()} documents</span>
                    </span>
                    <span>Database: {activeDatabase}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center space-y-2">
            <Database className="mx-auto h-8 w-8 text-slate-600" />
            <h4 className="text-sm font-semibold text-slate-300">No MongoDB Collections Loaded Yet</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Paste your MongoDB Connection Link above and click <strong>"Connect & Fetch Databases"</strong>, or click <strong>"Sample OSINT DB"</strong> to load preloaded intelligence records.
            </p>
          </div>
        )}
      </div>

      {/* Test Sample Size & Sampling Strategy */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Sliders className="h-4 w-4 text-cyan-400" />
              <span>Choose How Much Data To Test</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Select sample size from collection <span className="text-cyan-300 font-mono">{selectedCollection || 'none'}</span> to ingest into the NLP testing pipeline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick chips */}
            <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-500 font-medium px-2">Sample Size:</span>
              {samplePresets.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSampleSizeChange(preset)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-all font-mono ${
                    sampleSize === preset
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Sampling method */}
            <div className="flex items-center space-x-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400">Strategy:</span>
              <select
                value={samplingMethod}
                onChange={e => onSamplingMethodChange(e.target.value as any)}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                <option value="random" className="bg-slate-900 text-slate-200">MongoDB $sample (Random)</option>
                <option value="first_n" className="bg-slate-900 text-slate-200">First N (Sequential)</option>
                <option value="recent" className="bg-slate-900 text-slate-200">Most Recent First (_id DESC)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
