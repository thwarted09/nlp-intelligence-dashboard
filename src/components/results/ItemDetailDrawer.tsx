import React from 'react';
import { IntelligenceResultDoc } from '../../types/results';
import { EntityHighlighter } from './EntityHighlighter';
import { SentimentPolarityBar } from './SentimentPolarityBar';
import { PerceptionRadar } from './PerceptionRadar';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  Tag, 
  Bot, 
  Clock, 
  Edit3,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface ItemDetailDrawerProps {
  item: IntelligenceResultDoc | null;
  onClose: () => void;
  onUpdateValidation: (docId: string, status: 'verified' | 'flagged' | 'corrected', notes?: string) => void;
}

export const ItemDetailDrawer: React.FC<ItemDetailDrawerProps> = ({
  item,
  onClose,
  onUpdateValidation,
}) => {
  const [analystNotes, setAnalystNotes] = React.useState('');
  const [feedbackSaved, setFeedbackSaved] = React.useState(false);

  if (!item) return null;

  const handleApprove = () => {
    onUpdateValidation(item.docId, 'verified', analystNotes);
    setFeedbackSaved(true);
    setTimeout(() => setFeedbackSaved(false), 2000);
  };

  const handleFlag = () => {
    onUpdateValidation(item.docId, 'flagged', analystNotes);
    setFeedbackSaved(true);
    setTimeout(() => setFeedbackSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-cyan-950 p-2 text-cyan-400 border border-cyan-800/40">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white truncate max-w-md">
                  {item.originalDoc.title || item.originalDoc.source}
                </h3>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-cyan-400 border border-slate-700">
                  {item.originalDoc.sourceType}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">Doc ID: {item.docId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Highlighted Entity Text Inspection */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <Tag className="h-3.5 w-3.5 text-cyan-400" />
                <span>Extracted Entities & Analyzed Text</span>
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                {item.entities.length} entities tagged
              </span>
            </div>
            <EntityHighlighter text={item.originalDoc.text} entities={item.entities} />
          </div>

          {/* Dual Perception & Emotion Meters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SentimentPolarityBar perception={item.perception} />
            <PerceptionRadar emotions={item.perception.emotions} />
          </div>

          {/* Executive Intelligence Synthesis */}
          {item.summary.bulletPoints.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Executive Intelligence Synthesis (3 Bullets)
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {item.summary.bulletPoints.map((bullet, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-cyan-400 font-bold shrink-0">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Integrity & Disinfo Threat Signals */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${item.integrity.flagged ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'}`}>
                  {item.integrity.flagged ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-200">
                    {item.integrity.flagged ? 'Flagged for High Risk / Coordinated Influence' : 'Information Integrity Normal'}
                  </h5>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Toxicity: {(item.integrity.toxicityScore * 100).toFixed(0)}% • Bot Likelihood: {(item.integrity.propagandaProbability * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="text-right font-mono text-xs text-slate-400">
                <span>Model Confidence: </span>
                <strong className="text-cyan-400">{(item.overallConfidence * 100).toFixed(0)}%</strong>
              </div>
            </div>
          </div>

          {/* Human-in-the-Loop Analyst Validation Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-1.5">
              <Edit3 className="h-3.5 w-3.5 text-cyan-400" />
              <span>Analyst Output Validation & Feedback</span>
            </h4>
            <input
              type="text"
              value={analystNotes}
              onChange={e => setAnalystNotes(e.target.value)}
              placeholder="Add optional reviewer observation or note (e.g. 'Accurately classified stance')..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 font-mono">
                Current Status: <strong className="text-slate-300 capitalize">{item.humanValidation?.status || 'Pending'}</strong>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleFlag}
                  className="flex items-center space-x-1 rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-900/40"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  <span>Flag Inaccurate</span>
                </button>
                <button
                  onClick={handleApprove}
                  className="flex items-center space-x-1 rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/40"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span>Approve & Validate</span>
                </button>
              </div>
            </div>
            {feedbackSaved && (
              <p className="text-[11px] text-emerald-400 font-medium">✓ Feedback recorded for this record</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-6 py-3 text-xs text-slate-400">
          <span className="font-mono">Processing Latency: {item.processingTimeMs}ms</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
