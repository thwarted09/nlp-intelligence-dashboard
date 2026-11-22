import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, LogLevel } from '../../types/job';
import { Terminal, Download, Copy, Check, Search, Filter, Trash2 } from 'lucide-react';

interface LiveLogViewerProps {
  logs: LogEntry[];
  jobStatus: string;
  onClearLogs?: () => void;
}

export const LiveLogViewer: React.FC<LiveLogViewerProps> = ({ logs, jobStatus, onClearLogs }) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'SUCCESS': return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40';
      case 'WARN': return 'text-amber-400 bg-amber-950/60 border-amber-800/40';
      case 'ERROR': return 'text-rose-400 bg-rose-950/60 border-rose-800/40';
      case 'DEBUG': return 'text-indigo-400 bg-indigo-950/60 border-indigo-800/40';
      default: return 'text-cyan-400 bg-cyan-950/60 border-cyan-800/40';
    }
  };

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level}] ${l.stageName ? `[${l.stageName}] ` : ''}${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level}] ${l.stageName ? `[${l.stageName}] ` : ''}${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nlp-execution-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[480px] rounded-xl border border-slate-800 bg-slate-950 font-mono shadow-2xl overflow-hidden">
      {/* Console Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 gap-2">
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">Execution Stream Logs</span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
            {logs.length} lines
          </span>
          {jobStatus === 'RUNNING' && (
            <span className="flex items-center space-x-1.5 text-[10px] text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE</span>
            </span>
          )}
        </div>

        {/* Filter & Actions */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3 w-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter logs..."
              className="w-32 rounded border border-slate-800 bg-slate-950 pl-7 pr-2 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Level Filter */}
          <select
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
            className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Levels</option>
            <option value="INFO">INFO</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="DEBUG">DEBUG</option>
          </select>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`rounded px-2 py-1 text-[11px] font-medium border transition-colors ${
              autoScroll
                ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            Auto-scroll
          </button>

          {/* Copy */}
          <button
            onClick={handleCopyLogs}
            className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800"
            title="Copy logs"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          {/* Download */}
          <button
            onClick={handleDownloadLogs}
            className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800"
            title="Download log file"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 text-[11px] leading-relaxed space-y-1 select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 italic">
            Console ready. No logs to display for selected filter.
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="flex items-start space-x-2 font-mono hover:bg-slate-900/60 py-0.5 rounded px-1">
              <span className="text-slate-600 shrink-0 select-none">
                {log.timestamp}
              </span>
              <span
                className={`rounded px-1.5 py-0.2 text-[9px] font-bold shrink-0 border uppercase ${getLevelColor(
                  log.level
                )}`}
              >
                {log.level}
              </span>
              {log.stageName && (
                <span className="text-cyan-500 font-semibold shrink-0">
                  [{log.stageName}]
                </span>
              )}
              <span className="text-slate-300 break-all">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer status line */}
      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/70 px-4 py-1.5 text-[10px] text-slate-500">
        <span>Channel: <strong className="text-slate-400">stdio / WebSocket telemetry</strong></span>
        <span>Encoding: <strong className="text-slate-400">UTF-8</strong></span>
      </div>
    </div>
  );
};
