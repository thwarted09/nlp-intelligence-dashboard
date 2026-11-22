import React, { useState } from 'react';
import { PipelineWorkflow } from '../../types/nlp';
import { IntelligenceResultDoc } from '../../types/results';
import { processSingleDocument } from '../../services/nlpEngine';
import { EntityHighlighter } from '../results/EntityHighlighter';
import { SentimentPolarityBar } from '../results/SentimentPolarityBar';
import { PerceptionRadar } from '../results/PerceptionRadar';
import { Sparkles, Play, RotateCcw, Tag, ShieldCheck, Zap } from 'lucide-react';

interface SingleTextTesterProps {
  pipeline: PipelineWorkflow;
}

export const SingleTextTester: React.FC<SingleTextTesterProps> = ({ pipeline }) => {
  const [inputText, setInputText] = useState<string>(
    'Defense officials from Japan, South Korea, and the United States met today in Singapore to establish a coordinated naval monitoring protocol for the Malacca Strait. Chinese diplomatic representatives expressed grave concerns over autonomous drone patrols in international transit waters.'
  );
  const [result, setResult] = useState<IntelligenceResultDoc | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const sampleSnippets = [
    {
      label: 'Geopolitical Maritime Pact',
      text: 'Defense officials from Japan, South Korea, and the United States met today in Singapore to establish a coordinated naval monitoring protocol for the Malacca Strait. Chinese diplomatic representatives expressed grave concerns over autonomous drone patrols in international transit waters.',
    },
    {
      label: 'Social Panic & Disinfo Intercept',
      text: 'URGENT: Insiders leak that the Central Bank will freeze all commercial deposits exceeding 5,000 EUR in Berlin and Paris. Major supermarkets will reject contactless transactions by next Monday! Cash reserves are running out!',
    },
    {
      label: 'Tech Semiconductor Surge',
      text: 'TSMC reported record-breaking quarterly revenue driven by 2nm wafer demand for advanced AI accelerators. Industry analysts predict sustained capex expansion across global chip manufacturing hubs through 2028.',
    },
  ];

  const handleTest = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const mockDoc = {
        _id: 'test-' + Date.now().toString(36),
        source: 'Live Sandbox Input',
        sourceType: 'news' as const,
        timestamp: new Date().toISOString(),
        text: inputText,
        language: 'en',
        metadata: { rawTokens: inputText.split(/\s+/).length, verified: true },
      };

      const out = processSingleDocument(mockDoc, pipeline);
      setResult(out);
      setIsProcessing(false);
    }, 250);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <span className="rounded bg-cyan-950 px-2 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-800 font-mono">
            LIVE SANDBOX
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Active Pipeline: {pipeline.name}
          </span>
        </div>
        <h2 className="text-lg font-bold text-white mt-1">
          Single-Text Real-Time NLP Playground
        </h2>
        <p className="text-xs text-slate-400">
          Paste any raw article, intercepted message, or intelligence wire to immediately test your configured NLP models without running a full batch.
        </p>
      </div>

      {/* Preset Snippets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">Quick Test Snippets:</span>
        {sampleSnippets.map((s, idx) => (
          <button
            key={idx}
            onClick={() => setInputText(s.text)}
            className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-500/60 hover:text-cyan-300 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Text Area Input */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <textarea
          rows={4}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Paste or type text snippet to run through NLP pipeline..."
          className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
        />

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            {inputText.split(/\s+/).filter(Boolean).length} tokens / words
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setInputText('');
                setResult(null);
              }}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
            >
              Clear
            </button>
            <button
              onClick={handleTest}
              disabled={!inputText.trim() || isProcessing}
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              <span>{isProcessing ? 'Analyzing...' : 'Run Pipeline on Text'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sandbox Output Results */}
      {result && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span>Real-Time Model Output Inspection</span>
            </h3>
            <span className="text-xs font-mono text-cyan-400">
              Processed in {result.processingTimeMs}ms
            </span>
          </div>

          {/* Tagged text */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <Tag className="h-3.5 w-3.5 text-cyan-400" />
                <span>Extracted Entities (NER)</span>
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                {result.entities.length} detected
              </span>
            </div>
            <EntityHighlighter text={result.originalDoc.text} entities={result.entities} />
          </div>

          {/* Dual Perception Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SentimentPolarityBar perception={result.perception} />
            <PerceptionRadar emotions={result.perception.emotions} />
          </div>

          {/* Bullets Summary */}
          {result.summary.bulletPoints.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Executive Intelligence Synthesis
              </h4>
              <ul className="space-y-1 text-xs text-slate-300">
                {result.summary.bulletPoints.map((b, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
