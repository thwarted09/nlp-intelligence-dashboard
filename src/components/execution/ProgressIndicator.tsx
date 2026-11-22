import React from 'react';
import { JobProgress, JobStatus } from '../../types/job';
import { Activity, Clock, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ProgressIndicatorProps {
  status: JobStatus;
  progress: JobProgress;
  pipelineName: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  status,
  progress,
  pipelineName,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="flex items-center space-x-1.5 rounded-full bg-cyan-950 px-3 py-1 text-xs font-semibold text-cyan-400 border border-cyan-800">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span>RUNNING</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="flex items-center space-x-1.5 rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>COMPLETED</span>
          </span>
        );
      case 'PAUSED':
        return (
          <span className="rounded-full bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-800">
            PAUSED
          </span>
        );
      case 'FAILED':
        return (
          <span className="rounded-full bg-rose-950 px-3 py-1 text-xs font-semibold text-rose-400 border border-rose-800">
            FAILED
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400 border border-slate-700">
            IDLE
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-white">Job Progress & Status</h3>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Pipeline: <strong className="text-slate-200">{pipelineName}</strong>
          </p>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1 text-slate-300">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span>Elapsed: {progress.elapsedSec}s</span>
          </div>
          <div className="flex items-center space-x-1 text-slate-300">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Speed: {progress.docsPerSecond || 0} docs/s</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">
            Current Stage: <strong className="text-cyan-300 font-semibold">{progress.currentStageName || 'Ready'}</strong>
          </span>
          <span className="text-cyan-400 font-bold">
            {progress.percent}% ({progress.processedDocs}/{progress.totalDocs} docs)
          </span>
        </div>

        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-950">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-300 shadow-md shadow-cyan-500/50"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
