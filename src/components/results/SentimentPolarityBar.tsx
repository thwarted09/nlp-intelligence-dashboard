import React from 'react';
import { PerceptionResult } from '../../types/results';

interface SentimentPolarityBarProps {
  perception: PerceptionResult;
}

export const SentimentPolarityBar: React.FC<SentimentPolarityBarProps> = ({ perception }) => {
  const { polarityScore, sentiment, subjectivityScore, stance } = perception;

  // Map -1..1 to 0..100%
  const needlePosition = Math.max(0, Math.min(100, ((polarityScore + 1) / 2) * 100));

  const getSentimentColor = () => {
    if (sentiment === 'POSITIVE') return 'text-emerald-400 bg-emerald-950/80 border-emerald-800/60';
    if (sentiment === 'NEGATIVE') return 'text-rose-400 bg-rose-950/80 border-rose-800/60';
    return 'text-slate-300 bg-slate-800/80 border-slate-700/60';
  };

  const getStanceColor = () => {
    if (stance.label === 'SUPPORT') return 'text-emerald-400 border-emerald-800 bg-emerald-950/40';
    if (stance.label === 'OPPOSE') return 'text-rose-400 border-rose-800 bg-rose-950/40';
    return 'text-slate-400 border-slate-800 bg-slate-900';
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Perception Polarity</span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getSentimentColor()}`}>
            {sentiment} ({polarityScore > 0 ? `+${polarityScore}` : polarityScore})
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-mono">
          <span className="text-slate-500">Stance:</span>
          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${getStanceColor()}`}>
            {stance.label}
          </span>
        </div>
      </div>

      {/* Meter Bar */}
      <div className="relative pt-2 pb-1">
        <div className="h-2 w-full rounded-full bg-gradient-to-r from-rose-500 via-slate-700 to-emerald-500 shadow-inner" />
        
        {/* Center line */}
        <div className="absolute top-1 bottom-0 left-1/2 w-0.5 bg-slate-400/50 -translate-x-1/2" />

        {/* Needle indicator */}
        <div
          className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-300"
          style={{ left: `${needlePosition}%` }}
        >
          <div className="h-4 w-1.5 rounded-full bg-white ring-2 ring-cyan-500 shadow-lg" />
        </div>
      </div>

      {/* Bar labels */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span>-1.0 Hostile / Critical</span>
        <span>0.0 Neutral</span>
        <span>+1.0 Supportive / Favorable</span>
      </div>

      {/* Subjectivity indicator */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
        <span className="text-slate-500">Subjectivity Index:</span>
        <span className="text-slate-300">
          {(subjectivityScore * 100).toFixed(0)}% ({subjectivityScore > 0.5 ? 'Opinion / Sentiment Driven' : 'Factual / Objective Reporting'})
        </span>
      </div>
    </div>
  );
};
