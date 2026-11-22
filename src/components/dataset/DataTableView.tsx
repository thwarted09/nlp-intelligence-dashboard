import React from 'react';
import { MongoDocument } from '../../types/dataset';
import { Eye, ShieldCheck, AlertCircle, Hash, CheckSquare, Square, CheckCircle2 } from 'lucide-react';

interface DataTableViewProps {
  documents: MongoDocument[];
  onInspectDoc: (doc: MongoDocument) => void;
  selectedDocIds: string[];
  onToggleDocSelect: (docId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const DataTableView: React.FC<DataTableViewProps> = ({
  documents,
  onInspectDoc,
  selectedDocIds,
  onToggleDocSelect,
  onSelectAll,
  onDeselectAll,
}) => {
  const getSourceBadgeColor = (type: string) => {
    switch (type) {
      case 'news':
        return 'bg-blue-950/80 text-blue-400 border-blue-800/50';
      case 'social_media':
        return 'bg-purple-950/80 text-purple-400 border-purple-800/50';
      case 'telegram':
        return 'bg-sky-950/80 text-sky-400 border-sky-800/50';
      case 'diplomatic_wire':
        return 'bg-amber-950/80 text-amber-400 border-amber-800/50';
      case 'threat_intel':
        return 'bg-rose-950/80 text-rose-400 border-rose-800/50';
      case 'forum':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const allVisibleSelected = documents.length > 0 && documents.every(d => selectedDocIds.includes(d._id));
  const someSelected = documents.some(d => selectedDocIds.includes(d._id));

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-slate-500 mb-2" />
        <h4 className="text-sm font-semibold text-slate-300">No documents match current filters</h4>
        <p className="text-xs text-slate-500 mt-1">Try resetting the keyword search or selecting more source categories.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-950/90 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
            <tr>
              {/* Checkbox column */}
              <th className="py-3 px-3 w-10 text-center">
                <button
                  type="button"
                  onClick={allVisibleSelected ? onDeselectAll : onSelectAll}
                  className="text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                  title={allVisibleSelected ? 'Deselect all visible records' : 'Select all visible records for NLP activity'}
                >
                  {allVisibleSelected ? (
                    <CheckSquare className="h-4 w-4 text-cyan-400" />
                  ) : someSelected ? (
                    <div className="h-4 w-4 rounded border border-cyan-400 bg-cyan-950/80 flex items-center justify-center">
                      <div className="h-2 w-2 bg-cyan-400 rounded-sm" />
                    </div>
                  ) : (
                    <Square className="h-4 w-4 text-slate-600" />
                  )}
                </button>
              </th>
              <th className="py-3 px-3 w-12 text-slate-500">#</th>
              <th className="py-3 px-4 w-40">Source / Type</th>
              <th className="py-3 px-4">Extracted Content & NLP Status</th>
              <th className="py-3 px-4 w-32">Metadata</th>
              <th className="py-3 px-4 w-28">Timestamp</th>
              <th className="py-3 px-4 w-20 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {documents.map((doc, idx) => {
              const isSelected = selectedDocIds.includes(doc._id);
              return (
                <tr
                  key={doc._id}
                  onClick={() => onToggleDocSelect(doc._id)}
                  className={`transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-cyan-950/30 border-l-2 border-l-cyan-400' 
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Checkbox */}
                  <td className="py-3.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onToggleDocSelect(doc._id)}
                      className="text-slate-400 hover:text-cyan-400 cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-cyan-400" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-600 hover:text-slate-400" />
                      )}
                    </button>
                  </td>

                  {/* Index / ID */}
                  <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                    <span title={`_id: ${doc._id}`}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  </td>

                  {/* Source */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col space-y-1">
                      <span className="font-semibold text-slate-200 truncate max-w-[150px]">
                        {doc.source}
                      </span>
                      <span
                        className={`inline-block self-start rounded px-1.5 py-0.5 text-[10px] font-mono border ${getSourceBadgeColor(
                          doc.sourceType
                        )}`}
                      >
                        {doc.sourceType}
                      </span>
                    </div>
                  </td>

                  {/* Text Content */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center space-x-2">
                        {doc.title && (
                          <h5 className="font-semibold text-cyan-200 line-clamp-1 text-xs">
                            {doc.title}
                          </h5>
                        )}
                        {isSelected && (
                          <span className="inline-flex items-center space-x-1 rounded bg-cyan-950 px-1.5 py-0.2 text-[9px] font-bold text-cyan-300 border border-cyan-800 font-mono">
                            <CheckCircle2 className="h-2.5 w-2.5 text-cyan-400" />
                            <span>CHOSEN FOR NLP</span>
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 line-clamp-2 leading-relaxed text-xs">
                        {doc.text}
                      </p>
                      {doc.metadata?.targetTopic && (
                        <div className="flex items-center space-x-2 pt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
                            <Hash className="h-2.5 w-2.5 text-cyan-500" />
                            <span>{doc.metadata.targetTopic}</span>
                          </span>
                          {doc.metadata.region && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              • {doc.metadata.region}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Metadata Chips */}
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    <div className="flex flex-col space-y-1">
                      <span className="text-slate-400">
                        {doc.metadata?.rawTokens || doc.text.split(/\s+/).length} tokens
                      </span>
                      {doc.metadata?.verified && (
                        <span className="flex items-center space-x-1 text-emerald-400 text-[10px]">
                          <ShieldCheck className="h-3 w-3" />
                          <span>Verified</span>
                        </span>
                      )}
                      {doc.metadata?.botLikelihoodScore !== undefined && (
                        <span className="text-amber-400 text-[10px]">
                          Bot: {(doc.metadata.botLikelihoodScore * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Timestamp */}
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                    <div>{doc.timestamp ? doc.timestamp.split('T')[0] : 'N/A'}</div>
                    <div className="text-[10px] text-slate-500">
                      {doc.timestamp && doc.timestamp.includes('T') ? doc.timestamp.split('T')[1].slice(0, 8) + ' UTC' : ''}
                    </div>
                  </td>

                  {/* Inspect action */}
                  <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onInspectDoc(doc)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-cyan-400 border border-slate-800 transition-colors"
                      title="Inspect full MongoDB BSON document"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
