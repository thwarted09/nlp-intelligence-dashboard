import React, { useState } from 'react';
import { PipelineOutputData, IntelligenceResultDoc } from '../../types/results';
import { ItemDetailDrawer } from './ItemDetailDrawer';
import { 
  BarChart3, 
  Download, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Tag, 
  Activity, 
  ShieldCheck, 
  Clock, 
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';

interface ResultsDashboardProps {
  data: PipelineOutputData | null;
  datasetName: string;
  pipelineName: string;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  data,
  datasetName,
  pipelineName,
}) => {
  const [selectedItem, setSelectedItem] = useState<IntelligenceResultDoc | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [records, setRecords] = useState<IntelligenceResultDoc[]>(data?.records || []);

  React.useEffect(() => {
    if (data?.records) {
      setRecords(data.records);
    }
  }, [data]);

  if (!data || records.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
        <Activity className="mx-auto h-10 w-10 text-cyan-500/50" />
        <h3 className="text-base font-bold text-slate-200">No test results generated yet</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Navigate to the <strong className="text-cyan-400 font-medium">3. Run & Logs</strong> tab to execute your configured NLP pipeline against the test sample.
        </p>
      </div>
    );
  }

  const handleUpdateValidation = (docId: string, status: 'verified' | 'flagged' | 'corrected', notes?: string) => {
    const updated = records.map(r =>
      r.docId === docId
        ? {
            ...r,
            humanValidation: {
              status,
              notes,
              validatedAt: new Date().toISOString(),
            },
          }
        : r
    );
    setRecords(updated);
    if (selectedItem && selectedItem.docId === docId) {
      setSelectedItem(updated.find(r => r.docId === docId) || null);
    }
  };

  const filteredRecords = records.filter(r => {
    if (sentimentFilter !== 'ALL' && r.perception.sentiment !== sentimentFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchText = r.originalDoc.text.toLowerCase().includes(q);
      const matchSource = r.originalDoc.source.toLowerCase().includes(q);
      const matchEntity = r.entities.some(e => e.text.toLowerCase().includes(q));
      if (!matchText && !matchSource && !matchEntity) return false;
    }
    return true;
  });

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nlp-test-results-${data.jobId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ['DocID', 'Source', 'Sentiment', 'PolarityScore', 'Confidence', 'EntitiesCount', 'Flagged', 'TextSnippet'];
    const rows = records.map(r => [
      r.docId,
      `"${r.originalDoc.source.replace(/"/g, '""')}"`,
      r.perception.sentiment,
      r.perception.polarityScore,
      r.overallConfidence,
      r.entities.length,
      r.integrity.flagged ? 'YES' : 'NO',
      `"${r.originalDoc.text.slice(0, 100).replace(/"/g, '""')}..."`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nlp-test-results-${data.jobId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = records.length;
  const posCount = records.filter(r => r.perception.sentiment === 'POSITIVE').length;
  const neuCount = records.filter(r => r.perception.sentiment === 'NEUTRAL').length;
  const negCount = records.filter(r => r.perception.sentiment === 'NEGATIVE').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
              RESULTS READY
            </span>
            <span className="text-xs text-slate-400 font-mono">Job {data.jobId}</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-0.5">
            NLP Output Inspection & Perception Validation
          </h2>
          <p className="text-xs text-slate-400">
            Evaluating {records.length} records processed from <span className="text-cyan-300 font-mono">{datasetName}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportJSON}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <span className="text-[10px] font-mono uppercase text-slate-400">Total Validated</span>
          <div className="mt-1 text-xl font-black text-white font-mono">{records.length}</div>
          <span className="text-[10px] text-slate-500 font-mono">100% test batch</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <span className="text-[10px] font-mono uppercase text-slate-400">Avg Confidence</span>
          <div className="mt-1 text-xl font-black text-cyan-400 font-mono">
            {(data.stats.avgConfidence * 100).toFixed(0)}%
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Calibrated F1</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <span className="text-[10px] font-mono uppercase text-slate-400">Perception Bias</span>
          <div className="mt-1 text-xs font-bold text-slate-200 font-mono flex items-center space-x-1">
            <span className="text-emerald-400">{posCount} pos</span>
            <span>/</span>
            <span className="text-slate-400">{neuCount} neu</span>
            <span>/</span>
            <span className="text-rose-400">{negCount} neg</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Sentiment spectrum</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <span className="text-[10px] font-mono uppercase text-slate-400">Flagged Risks</span>
          <div className="mt-1 text-xl font-black text-amber-400 font-mono">
            {data.stats.flaggedCount}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">High toxicity / Bot</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <span className="text-[10px] font-mono uppercase text-slate-400">Avg Latency</span>
          <div className="mt-1 text-xl font-black text-slate-200 font-mono">
            {data.stats.avgLatencyMs}ms
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Per document</span>
        </div>
      </div>

      {/* Aggregate Entity & Topic Chips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Entities */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Tag className="h-3.5 w-3.5 text-cyan-400" />
              <span>Top Extracted Entities (NER)</span>
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">Frequency</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {data.stats.topEntities.map(ent => (
              <span
                key={ent.name}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1 text-xs text-slate-200"
              >
                <span className="font-medium">{ent.name}</span>
                <span className="text-[9px] font-mono px-1 rounded bg-slate-900 text-cyan-400">
                  {ent.category}
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  ×{ent.count}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Sentiment Distribution Bar */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              <span>Dataset Perception Distribution</span>
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">{total} docs</span>
          </div>

          <div className="h-3 w-full rounded-full bg-slate-950 flex overflow-hidden">
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${(posCount / total) * 100}%` }}
              title={`Positive: ${posCount}`}
            />
            <div
              className="bg-slate-600 transition-all"
              style={{ width: `${(neuCount / total) * 100}%` }}
              title={`Neutral: ${neuCount}`}
            />
            <div
              className="bg-rose-500 transition-all"
              style={{ width: `${(negCount / total) * 100}%` }}
              title={`Negative: ${negCount}`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Positive: {((posCount / total) * 100).toFixed(0)}%</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-slate-600" />
              <span>Neutral: {((neuCount / total) * 100).toFixed(0)}%</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Negative: {((negCount / total) * 100).toFixed(0)}%</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Table of Output Results */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search extracted entities, keywords, or text in outputs..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Sentiment Filter */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Sentiment:</span>
            <select
              value={sentimentFilter}
              onChange={e => setSentimentFilter(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Sentiments</option>
              <option value="POSITIVE">Positive</option>
              <option value="NEUTRAL">Neutral</option>
              <option value="NEGATIVE">Negative</option>
            </select>
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800/80">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
              <tr>
                <th className="py-3 px-4">Doc & Source</th>
                <th className="py-3 px-4">Analyzed Intelligence Content</th>
                <th className="py-3 px-4 w-32">Perception</th>
                <th className="py-3 px-4 w-28">Confidence</th>
                <th className="py-3 px-4 w-28">Validation</th>
                <th className="py-3 px-4 w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredRecords.map(item => (
                <tr key={item.docId} className="hover:bg-slate-800/40 transition-colors">
                  {/* Doc & Source */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-200 truncate max-w-[140px]">
                      {item.originalDoc.source}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      _id: ...{item.docId.slice(-6)}
                    </div>
                  </td>

                  {/* Text snippet with entity count */}
                  <td className="py-3.5 px-4">
                    <p className="line-clamp-2 text-slate-300 max-w-xl">
                      {item.originalDoc.text}
                    </p>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                        {item.entities.length} entities
                      </span>
                      {item.integrity.flagged && (
                        <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-800/40">
                          Risk Flag
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Perception Badge */}
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                        item.perception.sentiment === 'POSITIVE'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                          : item.perception.sentiment === 'NEGATIVE'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {item.perception.sentiment}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Score: {item.perception.polarityScore > 0 ? `+${item.perception.polarityScore}` : item.perception.polarityScore}
                    </div>
                  </td>

                  {/* Confidence Bar */}
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    <div className="flex items-center space-x-1.5">
                      <div className="h-1.5 w-12 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full"
                          style={{ width: `${item.overallConfidence * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-300">
                        {(item.overallConfidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>

                  {/* Validation Status */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium border capitalize ${
                        item.humanValidation?.status === 'verified'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : item.humanValidation?.status === 'flagged'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {item.humanValidation?.status === 'verified' ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      ) : null}
                      <span>{item.humanValidation?.status || 'Pending'}</span>
                    </span>
                  </td>

                  {/* Action inspect */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-cyan-500 hover:text-cyan-300 hover:bg-slate-700 transition-colors"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Detail Inspector Drawer / Modal */}
      {selectedItem && (
        <ItemDetailDrawer
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdateValidation={handleUpdateValidation}
        />
      )}
    </div>
  );
};
