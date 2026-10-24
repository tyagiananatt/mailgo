import React from 'react';
import { Search, Filter, RotateCw } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  searchSource?: 'elasticsearch' | 'database';
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
  isRefreshing,
  searchSource,
}) => {
  return (
    <header className="h-16 px-6 border-b border-[#f0f0f0] bg-white flex items-center justify-between gap-4 shrink-0">
      {/* Search Input Bar matching Figma */}
      <div className="relative flex-1 max-w-xl">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by recipient, subject, or content..."
          className="w-full pl-10 pr-4 py-2 bg-[#f4f5f7] border-0 rounded-full text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-800 transition-all"
        />
        {searchSource && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-mono bg-white/70 px-1.5 py-0.5 rounded border border-gray-200">
            {searchSource === 'elasticsearch' ? '⚡ ES' : 'DB'}
          </span>
        )}
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-2">
        <button
          title="Filter emails"
          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Filter className="w-4 h-4" />
        </button>
        <button
          title="Refresh list"
          onClick={onRefresh}
          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>
    </header>
  );
};
