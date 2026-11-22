import React from 'react';
import { PipelineWorkflow, PipelineStageConfig, NLPTaskDefinition } from '../../types/nlp';
import { PREDEFINED_NLP_TASKS } from '../../data/mockModels';
import { PREDEFINED_PIPELINES } from '../../data/predefinedPipelines';
import { TaskConfigModal } from './TaskConfigModal';
import { PipelineFlowGraph } from './PipelineFlowGraph';
import { 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Settings2, 
  Trash2, 
  Power, 
  Layers, 
  Sparkles, 
  FolderDown,
  CheckCircle2,
  Tag,
  Smile,
  Compass,
  Activity,
  Key,
  FileText,
  ShieldAlert
} from 'lucide-react';

interface PipelineBuilderProps {
  pipeline: PipelineWorkflow;
  onPipelineChange: (pipeline: PipelineWorkflow) => void;
  datasetName: string;
  sampleSize: number;
  stagedDocumentsCount?: number;
  onBackToSelection?: () => void;
}

export const PipelineBuilder: React.FC<PipelineBuilderProps> = ({
  pipeline,
  onPipelineChange,
  datasetName,
  sampleSize,
  stagedDocumentsCount,
  onBackToSelection,
}) => {
  const [editingStage, setEditingStage] = React.useState<PipelineStageConfig | null>(null);

  const getTaskIcon = (iconName: string) => {
    switch (iconName) {
      case 'Tag': return <Tag className="h-4 w-4" />;
      case 'Smile': return <Smile className="h-4 w-4" />;
      case 'Compass': return <Compass className="h-4 w-4" />;
      case 'Activity': return <Activity className="h-4 w-4" />;
      case 'Layers': return <Layers className="h-4 w-4" />;
      case 'Key': return <Key className="h-4 w-4" />;
      case 'FileText': return <FileText className="h-4 w-4" />;
      case 'ShieldAlert': return <ShieldAlert className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const handleToggleStage = (stageId: string) => {
    const updated = pipeline.stages.map(s =>
      s.stageId === stageId ? { ...s, enabled: !s.enabled } : s
    );
    onPipelineChange({ ...pipeline, stages: updated });
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pipeline.stages.length) return;

    const stagesCopy = [...pipeline.stages];
    const temp = stagesCopy[index];
    stagesCopy[index] = stagesCopy[targetIndex];
    stagesCopy[targetIndex] = temp;

    const reordered = stagesCopy.map((s, i) => ({ ...s, executionOrder: i + 1 }));
    onPipelineChange({ ...pipeline, stages: reordered });
  };

  const handleDeleteStage = (stageId: string) => {
    const filtered = pipeline.stages
      .filter(s => s.stageId !== stageId)
      .map((s, i) => ({ ...s, executionOrder: i + 1 }));
    onPipelineChange({ ...pipeline, stages: filtered });
  };

  const handleAddTask = (taskDef: NLPTaskDefinition) => {
    const newStage: PipelineStageConfig = {
      stageId: 'stage-' + Date.now().toString(36),
      taskId: taskDef.id,
      enabled: true,
      selectedModel: taskDef.defaultModel,
      parameters: { ...taskDef.defaultParams },
      executionOrder: pipeline.stages.length + 1,
    };
    onPipelineChange({
      ...pipeline,
      stages: [...pipeline.stages, newStage],
    });
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = PREDEFINED_PIPELINES.find(p => p.id === presetId);
    if (preset) {
      onPipelineChange({
        ...preset,
        id: 'pipe-custom-' + Date.now(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleSaveStageConfig = (updated: PipelineStageConfig) => {
    const updatedStages = pipeline.stages.map(s =>
      s.stageId === updated.stageId ? updated : s
    );
    onPipelineChange({ ...pipeline, stages: updatedStages });
  };

  const activeTaskDef = editingStage
    ? PREDEFINED_NLP_TASKS.find(t => t.id === editingStage.taskId)
    : null;

  const effectiveCount = stagedDocumentsCount !== undefined ? stagedDocumentsCount : sampleSize;

  return (
    <div className="space-y-6">
      {/* Target Scope Banner */}
      <div className="rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/30 to-slate-900 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white">
              Target Scope: Testing on <span className="text-cyan-300 font-mono font-black">{effectiveCount} chosen records</span> from <span className="text-slate-300 font-mono">{datasetName}</span>
            </span>
            <p className="text-[11px] text-slate-400">
              Only the {effectiveCount} records you selected will be sent through the NLP pipeline (not the whole file).
            </p>
          </div>
        </div>

        {onBackToSelection && (
          <button
            type="button"
            onClick={onBackToSelection}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-slate-700 transition-colors shrink-0"
          >
            ← Modify Selected Documents
          </button>
        )}
      </div>

      {/* Header with Preset Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            <span>NLP Testing Pipeline Builder</span>
          </h2>
          <p className="text-xs text-slate-400">
            Chain and configure modular NLP tasks into an evaluation workflow for your chosen records.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
          <FolderDown className="h-4 w-4 text-cyan-400" />
          <span className="text-slate-400">Workflow Preset:</span>
          <select
            onChange={e => handleLoadPreset(e.target.value)}
            defaultValue=""
            className="bg-transparent text-cyan-300 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="" disabled className="bg-slate-900 text-slate-400">
              Load Preset Template...
            </option>
            {PREDEFINED_PIPELINES.map(p => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visual Flow Graph */}
      <PipelineFlowGraph
        pipeline={pipeline}
        taskDefs={PREDEFINED_NLP_TASKS}
        datasetName={datasetName}
        sampleSize={effectiveCount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Pipeline Stages List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Configured Stages in Active Pipeline ({pipeline.stages.length})
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              Drag or reorder execution flow
            </span>
          </div>

          <div className="space-y-2.5">
            {pipeline.stages.map((stage, idx) => {
              const def = PREDEFINED_NLP_TASKS.find(t => t.id === stage.taskId);
              const model = def?.availableModels.find(m => m.id === stage.selectedModel);
              return (
                <div
                  key={stage.stageId}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    stage.enabled
                      ? 'border-slate-800 bg-slate-900/80 shadow-sm'
                      : 'border-slate-800/40 bg-slate-950/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 font-mono text-xs font-bold text-cyan-400">
                      {idx + 1}
                    </span>

                    <div className="rounded-lg bg-slate-800 p-2 text-cyan-400">
                      {def ? getTaskIcon(def.icon) : <Sparkles className="h-4 w-4" />}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-white">
                          {def?.name || stage.taskId}
                        </span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-cyan-400 border border-slate-700">
                          {def?.badge}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono mt-0.5">
                        <span className="text-cyan-300/80">{model?.name || stage.selectedModel}</span>
                        <span>•</span>
                        <span className="text-slate-500">~{model?.latencyMs || 40}ms</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleMoveStage(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20"
                      title="Move stage earlier"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveStage(idx, 'down')}
                      disabled={idx === pipeline.stages.length - 1}
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20"
                      title="Move stage later"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStage(stage)}
                      className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                      title="Configure hyperparameters & model"
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStage(stage.stageId)}
                      className={`p-1.5 rounded transition-colors ${
                        stage.enabled
                          ? 'text-emerald-400 hover:bg-emerald-950/40'
                          : 'text-slate-500 hover:bg-slate-800'
                      }`}
                      title={stage.enabled ? 'Disable stage' : 'Enable stage'}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStage(stage.stageId)}
                      className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30"
                      title="Remove stage"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Predefined NLP Tasks Library */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Predefined NLP Tasks Library
            </h3>
            <span className="text-[11px] text-cyan-400 font-mono">
              Click + to append
            </span>
          </div>

          <div className="space-y-2">
            {PREDEFINED_NLP_TASKS.map(task => {
              const isAlreadyInPipeline = pipeline.stages.some(s => s.taskId === task.id);
              return (
                <div
                  key={task.id}
                  className="group rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 hover:border-slate-700 hover:bg-slate-900/80 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2.5">
                      <div className="mt-0.5 rounded-lg bg-slate-800 p-1.5 text-cyan-400 group-hover:bg-cyan-950 group-hover:text-cyan-300">
                        {getTaskIcon(task.icon)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-slate-200">
                            {task.name}
                          </h4>
                          {isAlreadyInPipeline && (
                            <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/70 px-1.5 py-0.2 rounded border border-emerald-800/40">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {task.description}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddTask(task)}
                      className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800/90 px-2 py-1 text-[11px] font-medium text-slate-200 hover:border-cyan-500 hover:text-cyan-300 hover:bg-cyan-950/40 transition-all shrink-0 ml-2"
                      title="Append to active pipeline"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Editing Stage Modal */}
      {editingStage && activeTaskDef && (
        <TaskConfigModal
          stage={editingStage}
          taskDef={activeTaskDef}
          isOpen={true}
          onClose={() => setEditingStage(null)}
          onSave={handleSaveStageConfig}
        />
      )}
    </div>
  );
};
