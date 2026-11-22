import React from 'react';
import { PipelineStageConfig, NLPTaskDefinition } from '../../types/nlp';
import { X, Settings, Check, Sparkles } from 'lucide-react';

interface TaskConfigModalProps {
  stage: PipelineStageConfig;
  taskDef: NLPTaskDefinition;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedStage: PipelineStageConfig) => void;
}

export const TaskConfigModal: React.FC<TaskConfigModalProps> = ({
  stage,
  taskDef,
  isOpen,
  onClose,
  onSave,
}) => {
  const [selectedModel, setSelectedModel] = React.useState(stage.selectedModel);
  const [params, setParams] = React.useState({ ...stage.parameters });

  if (!isOpen) return null;

  const handleParamChange = (key: string, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave({
      ...stage,
      selectedModel,
      parameters: params,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-cyan-950 p-2 text-cyan-400 border border-cyan-800/40">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Configure: {taskDef.name}</h3>
              <p className="text-xs text-slate-400">Stage #{stage.executionOrder} • {taskDef.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Active Model Runtime
          </label>
          <div className="space-y-2">
            {taskDef.availableModels.map(model => (
              <label
                key={model.id}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedModel === model.id
                    ? 'border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-500/30'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="model"
                    value={model.id}
                    checked={selectedModel === model.id}
                    onChange={() => setSelectedModel(model.id)}
                    className="text-cyan-500 focus:ring-cyan-500"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-slate-200">{model.name}</span>
                      {model.recommended && (
                        <span className="rounded bg-cyan-900/50 px-1.5 py-0.2 text-[9px] font-semibold text-cyan-300 border border-cyan-700/50">
                          Recommended
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Provider: {model.provider}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400">~{model.latencyMs}ms/doc</span>
              </label>
            ))}
          </div>
        </div>

        {/* Dynamic Hyper-parameters */}
        {taskDef.paramSchema.length > 0 && (
          <div className="space-y-4 border-t border-slate-800 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Hyper-parameters & Thresholds
            </h4>
            {taskDef.paramSchema.map(schema => {
              const val = params[schema.key] !== undefined ? params[schema.key] : schema.default;
              return (
                <div key={schema.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-300 font-medium">
                      {schema.label}
                    </label>
                    {schema.type === 'slider' && (
                      <span className="font-mono text-xs text-cyan-400 font-bold">
                        {val}
                      </span>
                    )}
                  </div>

                  {schema.type === 'slider' && (
                    <input
                      type="range"
                      min={schema.min}
                      max={schema.max}
                      step={schema.step}
                      value={val}
                      onChange={e => handleParamChange(schema.key, parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  )}

                  {schema.type === 'boolean' && (
                    <label className="flex items-center space-x-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={Boolean(val)}
                        onChange={e => handleParamChange(schema.key, e.target.checked)}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-xs text-slate-300">Enable feature</span>
                    </label>
                  )}

                  {schema.type === 'select' && (
                    <select
                      value={val}
                      onChange={e => handleParamChange(schema.key, e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:border-cyan-500"
                    >
                      {schema.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {schema.type === 'text' && (
                    <input
                      type="text"
                      value={val}
                      onChange={e => handleParamChange(schema.key, e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:border-cyan-500"
                    />
                  )}

                  <p className="text-[11px] text-slate-500">{schema.description}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end space-x-3 border-t border-slate-800 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          >
            <Check className="h-4 w-4" />
            <span>Apply Stage Config</span>
          </button>
        </div>
      </div>
    </div>
  );
};
