import React from 'react';
import { DatasetFilter } from '../../types/dataset';
import { Search, Filter, RotateCcw } from 'lucide-react';

interface FilterPanelProps {
  filter: DatasetFilter;
  onFilterChange: (filter: DatasetFilter) => void;
  availableSourceTypes: string[];
  totalAvailable: number;
  totalFiltered: number;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filter,
  onFilterChange,
  availableSourceTypes,
  totalAvailable,
  totalFiltered,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filter, searchQuery: e.target.value });
  };

  const handleSourceTypeToggle = (type: string) => {
    const exists = filter.sourceTypes.includes(type);
    const updated = exists
      ? filter.sourceTypes.filter(t => t !== type)
      : [...filter.sourceTypes, type];
    onFilterChange({ ...filter, sourceTypes: updated });
  };

  const handleReset = () => {
    onFilterChange({
      ...filter,
      searchQuery: '',
      sourceTypes: [],
      languages: [],
    });
  };

  const isFiltered = filter.searchQuery !== '' || filter.sourceTypes.length > 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={filter.searchQuery}
            onChange={handleSearchChange}
            placeholder="Search text, headline, or keywords across collected records..."
            className="w-full rounded-lg border border-slate-800 bg-slate-950/80 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Counter and Reset */}
        <div className="flex items-center space-x-3 text-xs">
          <span className="text-slate-400">
            Showing <strong className="text-cyan-400 font-mono">{totalFiltered}</strong> of{' '}
            <span className="text-slate-300 font-mono">{totalAvailable}</span> sample records
          </span>
          {isFiltered && (
            <button
              onClick={handleReset}
              className="flex items-center space-x-1 text-slate-400 hover:text-cyan-400 text-xs transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Source Type Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-medium text-slate-500 mr-1 flex items-center space-x-1">
          <Filter className="h-3 w-3" />
          <span>Source Type:</span>
        </span>
        {availableSourceTypes.map(type => {
          const active = filter.sourceTypes.includes(type);
          return (
            <button
              key={type}
              onClick={() => handleSourceTypeToggle(type)}
              className={`rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-all capitalize ${
                active
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          );
        })}
      </div>
    </div>
  );
};
