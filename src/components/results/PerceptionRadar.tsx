import React from 'react';
import { PerceptionResult } from '../../types/results';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface PerceptionRadarProps {
  emotions: PerceptionResult['emotions'];
}

export const PerceptionRadar: React.FC<PerceptionRadarProps> = ({ emotions }) => {
  const items = [
    { name: 'Fear / Panic', val: emotions.fear, color: 'from-amber-500 to-orange-600', isAlert: emotions.fear > 0.6 },
    { name: 'Anger / Rage', val: emotions.anger, color: 'from-rose-500 to-red-600', isAlert: emotions.anger > 0.6 },
    { name: 'Trust / Credibility', val: emotions.trust, color: 'from-cyan-500 to-blue-600', isAlert: false },
    { name: 'Joy / Optimism', val: emotions.joy, color: 'from-emerald-500 to-teal-600', isAlert: false },
    { name: 'Sadness / Loss', val: emotions.sadness, color: 'from-indigo-500 to-purple-600', isAlert: false },
    { name: 'Surprise / Shock', val: emotions.surprise, color: 'from-yellow-400 to-amber-500', isAlert: emotions.surprise > 0.7 },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-mono uppercase text-slate-500 font-bold">
          Affect & Emotion Spectrum
        </h4>
        {items.some(i => i.isAlert) && (
          <span className="flex items-center space-x-1 text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
            <AlertTriangle className="h-3 w-3" />
            <span>Escalation Trigger</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {items.map(item => (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">{item.name}</span>
              <span className="text-slate-200 font-bold">{(item.val * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(100, item.val * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
