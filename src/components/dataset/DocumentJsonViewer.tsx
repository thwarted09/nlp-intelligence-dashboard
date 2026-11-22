import React from 'react';
import { MongoDocument } from '../../types/dataset';
import { X, Copy, Check, FileJson } from 'lucide-react';

interface DocumentJsonViewerProps {
  document: MongoDocument | null;
  onClose: () => void;
}

export const DocumentJsonViewer: React.FC<DocumentJsonViewerProps> = ({ document, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!document) return null;

  const mongoRepresentation = {
    _id: { $oid: document._id },
    source: document.source,
    sourceType: document.sourceType,
    timestamp: { $date: document.timestamp },
    author: document.author || null,
    title: document.title || null,
    text: document.text,
    language: document.language,
    url: document.url || null,
    metadata: document.metadata,
  };

  const jsonString = JSON.stringify(mongoRepresentation, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-cyan-950 p-2 text-cyan-400 border border-cyan-800/40">
              <FileJson className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">MongoDB BSON / JSON Document Inspector</h3>
              <p className="text-xs text-slate-400 font-mono">_id: {document._id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy BSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 font-mono text-xs leading-relaxed">
          <pre className="text-slate-300">
            {jsonString}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/50 px-6 py-3 text-xs text-slate-400">
          <span>Source: <strong className="text-slate-200">{document.source}</strong></span>
          <span>Tokens: <strong className="text-cyan-400">{document.metadata.rawTokens || 50}</strong></span>
        </div>
      </div>
    </div>
  );
};
