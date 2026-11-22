import React from 'react';
import { CheckSquare, Square, Filter, ArrowRight, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

interface NlpStagingBarProps {
  totalLoaded: number;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectTopN: (n: number) => void;
  showOnlySelected: boolean;
  onToggleShowOnlySelected: () => void;
  onProceedToPipeline: () => void;
  datasetName: string;
}

export const NlpStagingBar: React.FC<NlpStagingBarProps> = ({
  totalLoaded,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onSelectTopN,
  showOnlySelected,
  onToggleShowOnlySelected,
  onProceedToPipeline,
  datasetName,
}) => {
  return (
    <div className="rounded-xl border border-cyan-500/40 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/30 p-3.5 shadow-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Status & Selection Counter */}
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                NLP Activity Staging
              </span>
              <span className="rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-bold font-mono text-cyan-300 border border-cyan-800">
                {selectedCount} of {totalLoaded} chosen
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Only the {selectedCount} checked records will be passed to the NLP activity (not the whole file).
            </p>
          </div>
        </div>

        {/* Center: Quick Select Controls */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={onSelectAll}
            className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300 hover:text-white hover:border-cyan-500 transition-colors"
          >
            <CheckSquare className="h-3.5 w-3.5 text-cyan-400" />
            <span>Select All ({totalLoaded})</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTopN(5)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] font-mono text-slate-300 hover:text-cyan-400 hover:border-slate-700"
          >
            Pick Top 5
          </button>

          <button
            type="button"
            onClick={() => onSelectTopN(10)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] font-mono text-slate-300 hover:text-cyan-400 hover:border-slate-700"
          >
            Pick Top 10
          </button>

          {selectedCount > 0 && (
            <button
              type="button"
              onClick={onDeselectAll}
              className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-400 hover:text-rose-400 hover:border-rose-900 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}

          {/* Toggle View: Show Only Chosen */}
          <button
            type="button"
            onClick={onToggleShowOnlySelected}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              showOnlySelected
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            {showOnlySelected ? 'Showing Only Chosen' : 'Show All Loaded'}
          </button>
        </div>

        {/* Right: Proceed to Pipeline with Chosen button */}
        <button
          type="button"
          onClick={onProceedToPipeline}
          disabled={selectedCount === 0}
          className="flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-slate-950 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all shrink-0"
        >
          <span>Take Chosen ({selectedCount}) to NLP Pipeline</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
