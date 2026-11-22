import React from 'react';
import { 
  Database, 
  Cpu, 
  PlayCircle, 
  BarChart3, 
  Terminal, 
  Code2, 
  Sparkles,
  Server
} from 'lucide-react';

export type ActiveTab = 'dataset' | 'pipeline' | 'execution' | 'results' | 'playground' | 'backend-guide';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  datasetName: string;
  totalRecords: number;
  isBackendLive: boolean;
  onOpenBackendConfig: () => void;
  jobRunning: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  datasetName,
  totalRecords,
  isBackendLive,
  onOpenBackendConfig,
  jobRunning,
}) => {
  const tabs = [
    { id: 'dataset', label: '1. Dataset & Filter', icon: Database, badge: `${totalRecords.toLocaleString()} docs` },
    { id: 'pipeline', label: '2. NLP Pipeline', icon: Cpu, badge: 'Tasks' },
    { id: 'execution', label: '3. Run & Logs', icon: PlayCircle, badge: jobRunning ? 'Running' : undefined },
    { id: 'results', label: '4. Results & Validate', icon: BarChart3, badge: 'Outputs' },
    { id: 'playground', label: 'Playground', icon: Sparkles },
    { id: 'backend-guide', label: 'Backend Guide', icon: Code2, badge: 'API' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
            <Server className="h-5 w-5 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold tracking-tight text-white">IntelNLP Studio</span>
              <span className="rounded bg-cyan-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400 ring-1 ring-cyan-800">
                v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[240px]">
              {datasetName}
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="hidden md:flex items-center space-x-1 rounded-xl bg-slate-900/80 p-1 ring-1 ring-slate-800">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as ActiveTab)}
                className={`relative flex items-center space-x-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                      isActive
                        ? 'bg-cyan-500/30 text-cyan-200'
                        : tab.badge === 'Running'
                        ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Backend connector toggle button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenBackendConfig}
            className="flex items-center space-x-2 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-500/50 hover:bg-slate-800 transition-all shadow-sm"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isBackendLive ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-cyan-400'
              }`}
            />
            <span className="hidden sm:inline">
              {isBackendLive ? 'Live API (MongoDB)' : 'Simulation (Mock DB)'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Config</span>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex md:hidden overflow-x-auto border-t border-slate-800/80 bg-slate-900/60 px-3 py-1.5 space-x-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as ActiveTab)}
              className={`flex shrink-0 items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                isActive ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
