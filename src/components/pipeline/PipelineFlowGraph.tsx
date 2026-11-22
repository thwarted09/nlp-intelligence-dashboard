import React from 'react';
import { PipelineWorkflow, NLPTaskDefinition } from '../../types/nlp';
import { ArrowRight, Database, CheckCircle2, ChevronRight, Activity } from 'lucide-react';

interface PipelineFlowGraphProps {
  pipeline: PipelineWorkflow;
  taskDefs: NLPTaskDefinition[];
  datasetName: string;
  sampleSize: number;
}

export const PipelineFlowGraph: React.FC<PipelineFlowGraphProps> = ({
  pipeline,
  taskDefs,
  datasetName,
  sampleSize,
}) => {
  const activeStages = pipeline.stages.filter(s => s.enabled);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <span>Interactive Workflow Architecture Diagram</span>
        </h4>
        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
          {activeStages.length} Active Steps
        </span>
      </div>

      <div className="overflow-x-auto pb-2 pt-1">
        <div className="flex items-center space-x-2 min-w-max">
          {/* Source node */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-950/20 px-3.5 py-2.5 text-center shadow-sm">
            <div className="flex items-center space-x-1.5 text-cyan-400 mb-1">
              <Database className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase">MongoDB Source</span>
            </div>
            <span className="text-[11px] text-slate-300 font-mono truncate max-w-[130px]">
              {datasetName}
            </span>
            <span className="text-[10px] text-cyan-300/80 font-mono">
              {sampleSize} test sample docs
            </span>
          </div>

          <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />

          {/* Pipeline stages */}
          {activeStages.map((stage, idx) => {
            const def = taskDefs.find(t => t.id === stage.taskId);
            return (
              <React.Fragment key={stage.stageId}>
                <div className="flex flex-col rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 shadow-sm min-w-[160px] max-w-[200px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-cyan-400">
                      STEP {idx + 1}
                    </span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <span className="text-xs font-bold text-slate-100 truncate">
                    {def?.name || stage.taskId}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                    {stage.selectedModel}
                  </span>
                </div>

                {idx < activeStages.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}

          <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />

          {/* Output node */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-950/20 px-3.5 py-2.5 text-center shadow-sm">
            <div className="flex items-center space-x-1.5 text-emerald-400 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase">Validated Output</span>
            </div>
            <span className="text-[11px] text-slate-300 font-mono">
              Enriched Intel DB
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              Ready for Analysis
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
