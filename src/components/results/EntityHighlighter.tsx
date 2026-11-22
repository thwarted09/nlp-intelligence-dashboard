import React from 'react';
import { ExtractedEntity } from '../../types/results';

interface EntityHighlighterProps {
  text: string;
  entities: ExtractedEntity[];
}

export const EntityHighlighter: React.FC<EntityHighlighterProps> = ({ text, entities }) => {
  if (!entities || entities.length === 0) {
    return <span className="text-slate-300 leading-relaxed">{text}</span>;
  }

  // Sort entities by start index
  const sorted = [...entities].sort((a, b) => a.start - b.start);

  const getEntityBadgeStyle = (category: string) => {
    switch (category) {
      case 'PERSON':
        return 'bg-amber-950/70 text-amber-300 border-amber-700/60';
      case 'ORG':
        return 'bg-blue-950/70 text-blue-300 border-blue-700/60';
      case 'GPE':
      case 'LOC':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60';
      case 'EVENT':
        return 'bg-purple-950/70 text-purple-300 border-purple-700/60';
      case 'PRODUCT':
        return 'bg-cyan-950/70 text-cyan-300 border-cyan-700/60';
      default:
        return 'bg-rose-950/70 text-rose-300 border-rose-700/60';
    }
  };

  const elements: React.ReactNode[] = [];
  let currentIndex = 0;

  for (let i = 0; i < sorted.length; i++) {
    const ent = sorted[i];

    // Ensure non-overlapping range
    if (ent.start >= currentIndex) {
      // Add text before entity
      if (ent.start > currentIndex) {
        elements.push(
          <span key={`text-${currentIndex}`}>
            {text.substring(currentIndex, ent.start)}
          </span>
        );
      }

      // Add highlighted entity
      const entityText = text.substring(ent.start, ent.end);
      elements.push(
        <span
          key={`entity-${i}-${ent.start}`}
          className={`inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded border text-xs font-medium cursor-help transition-all hover:scale-105 ${getEntityBadgeStyle(
            ent.category
          )}`}
          title={`${ent.category} • Confidence: ${(ent.confidence * 100).toFixed(0)}%`}
        >
          <span>{entityText}</span>
          <span className="text-[9px] font-mono opacity-75 uppercase font-bold">
            [{ent.category}]
          </span>
        </span>
      );

      currentIndex = ent.end;
    }
  }

  // Add trailing text
  if (currentIndex < text.length) {
    elements.push(
      <span key={`text-end-${currentIndex}`}>
        {text.substring(currentIndex)}
      </span>
    );
  }

  return (
    <div className="leading-relaxed text-slate-300 text-xs font-sans select-text">
      {elements}
    </div>
  );
};
