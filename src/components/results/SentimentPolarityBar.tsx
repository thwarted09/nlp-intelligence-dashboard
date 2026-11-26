import React from 'react';
import { PerceptionResult } from '../../types/results';

interface SentimentPolarityBarProps {
  perception: PerceptionResult;
}

export const SentimentPolarityBar: React.FC<SentimentPolarityBarProps> = ({ perception }) => {
  const { polarityScore, sentiment, subjectivityScore, vader } = perception;

  // Map -1..1 to 0..100%
  const needlePosition = Math.max(0, Math.min(100, ((polarityScore + 1) / 2) * 100));

  const getSentimentColor = () => {
    if (sentiment === 'POSITIVE') return 'text-emerald-400 bg-emerald-950/80 border-emerald-800/60';
    if (sentiment === 'NEGATIVE') return 'text-rose-400 bg-rose-950/80 border-rose-800/60';
    return 'text-slate-300 bg-slate-800/80 border-slate-700/60';
  };

  const posPct = vader?.pos ? (vader.pos * 100).toFixed(1) : '0.0';
  const neuPct = vader?.neu ? (vader.neu * 100).toFixed(1) : '0.0';
  const negPct = vader?.neg ? (vader.neg * 100).toFixed(1) : '0.0';
  const compound = vader?.compound !== undefined ? vader.compound : polarityScore;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">VADER Sentiment Polarity</span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getSentimentColor()}`}>
            {sentiment} (compound: {compound > 0 ? `+${compound}` : compound})
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
          <span>Thresholds: +0.05 / -0.05</span>
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
        <span>-1.0 Negative</span>
        <span>0.0 Neutral</span>
        <span>+1.0 Positive</span>
      </div>

      {/* VADER Distribution Breakdown */}
      <div className="pt-2 border-t border-slate-800/80 grid grid-cols-4 gap-2 text-center font-mono text-[10px]">
        <div className="bg-slate-900/80 rounded p-1 border border-slate-800">
          <span className="text-slate-500 block">Positive</span>
          <span className="text-emerald-400 font-bold">{posPct}%</span>
        </div>
        <div className="bg-slate-900/80 rounded p-1 border border-slate-800">
          <span className="text-slate-500 block">Neutral</span>
          <span className="text-slate-300 font-bold">{neuPct}%</span>
        </div>
        <div className="bg-slate-900/80 rounded p-1 border border-slate-800">
          <span className="text-slate-500 block">Negative</span>
          <span className="text-rose-400 font-bold">{negPct}%</span>
        </div>
        <div className="bg-slate-900/80 rounded p-1 border border-slate-800">
          <span className="text-slate-500 block">Subjectivity</span>
          <span className="text-cyan-400 font-bold">{(subjectivityScore * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
};
