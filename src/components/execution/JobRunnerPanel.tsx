import React from 'react';
import { JobExecution } from '../../types/job';
import { PipelineWorkflow } from '../../types/nlp';
import { DatasetInfo } from '../../types/dataset';
import { ProgressIndicator } from './ProgressIndicator';
import { LiveLogViewer } from './LiveLogViewer';
import { Play, ArrowRight, Database, Layers, Sparkles, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface JobRunnerPanelProps {
  dataset: DatasetInfo;
  pipeline: PipelineWorkflow;
  sampleSize: number;
  stagedCount?: number;
  job: JobExecution;
  isRunning: boolean;
  onRunJob: () => void;
  onViewResults: () => void;
}

export const JobRunnerPanel: React.FC<JobRunnerPanelProps> = ({
  dataset,
  pipeline,
  sampleSize,
  stagedCount,
  job,
  isRunning,
  onRunJob,
  onViewResults,
}) => {
  const activeStages = pipeline.stages.filter(s => s.enabled);
  const targetCount = stagedCount !== undefined ? stagedCount : sampleSize;

  const handleRun = () => {
    onRunJob();
  };

  React.useEffect(() => {
    if (job.status === 'COMPLETED' && !isRunning) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#06b6d4', '#3b82f6', '#10b981'],
        });
      } catch (e) {
        // ignore if not supported
      }
    }
  }, [job.status, isRunning]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="rounded bg-cyan-950 px-2 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-800/60 font-mono">
                EXECUTION WORKSPACE
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Job ID: {job.jobId}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white">
              Execute & Validate NLP Testing Workflow
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Dispatch the configured pipeline exclusively against the <strong className="text-cyan-300 font-mono font-bold">{targetCount} documents</strong> you cherry-picked from MongoDB collection <span className="text-slate-200 font-mono">{dataset.collectionName}</span> (not the whole file).
            </p>
          </div>

          {/* Action Button Deck */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRun}
              disabled={isRunning || targetCount === 0}
              className={`flex items-center space-x-2.5 rounded-xl px-6 py-3.5 text-sm font-bold shadow-lg transition-all ${
                isRunning || targetCount === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-white hover:brightness-110 hover:shadow-cyan-500/25 active:scale-95'
              }`}
            >
              <Play className={`h-5 w-5 ${isRunning ? 'animate-spin' : 'fill-current'}`} />
              <span>{isRunning ? 'Processing Test Batch...' : `Run Pipeline on ${targetCount} Chosen Docs`}</span>
            </button>

            {job.status === 'COMPLETED' && (
              <button
                onClick={onViewResults}
                className="flex items-center space-x-2 rounded-xl bg-emerald-600/20 px-5 py-3.5 text-sm font-semibold text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-all shadow-md"
              >
                <span>Inspect Results & Outputs</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Job Configuration Parameters Summary Cards */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-800/80">
          <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
            <span className="text-[10px] font-mono uppercase text-slate-500">Target Collection</span>
            <div className="mt-1 flex items-center space-x-1.5 text-xs font-semibold text-slate-200">
              <Database className="h-3.5 w-3.5 text-cyan-400" />
              <span className="truncate">{dataset.collectionName}</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
            <span className="text-[10px] font-mono uppercase text-slate-500">Staged For NLP Activity</span>
            <div className="mt-1 flex items-center space-x-1.5 text-xs font-semibold text-slate-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-cyan-300 font-mono font-bold">{targetCount}</span>
              <span>chosen records</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
            <span className="text-[10px] font-mono uppercase text-slate-500">Pipeline Stages</span>
            <div className="mt-1 flex items-center space-x-1.5 text-xs font-semibold text-slate-200">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              <span>{activeStages.length} active steps</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
            <span className="text-[10px] font-mono uppercase text-slate-500">Estimated Runtime</span>
            <div className="mt-1 flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 font-mono">
              <Sparkles className="h-3.5 w-3.5" />
              <span>~{Math.max(1, Math.round((targetCount * 100) / 1000))} sec</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Progress Bar */}
      <ProgressIndicator
        status={job.status}
        progress={job.progress}
        pipelineName={pipeline.name}
      />

      {/* Real-time Streaming Logs Terminal */}
      <LiveLogViewer
        logs={job.logs}
        jobStatus={job.status}
      />
    </div>
  );
};
