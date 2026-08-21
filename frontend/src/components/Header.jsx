import React from 'react';
import { Search, UploadCloud, RefreshCw, MoreVertical } from 'lucide-react';

export const Header = ({ onRefresh, onUploadClick, onOpenCommandPalette, isRunning }) => {
  return (
    <div className="flex flex-col space-y-4 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-textDark">
            LedgerTrace: 3-Way Reconciliation Controller
          </h1>
          <p className="text-xs text-textMuted font-mono mt-1">
            Autonomous Financial Lineage & Multi-Party Discrepancy Resolution Tool
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-xs font-mono text-textMuted flex items-center space-x-1.5">
            <span>Status:</span>
            <span className="font-semibold text-green-700">Live</span>
          </div>
          <div className="h-3.5 w-px bg-borderCol"></div>
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center space-x-2 bg-white border border-borderCol hover:border-gray-400 px-3 py-1.5 rounded text-xs text-textDark font-mono transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-textMuted" />
            <span>Search UTR</span>
            <kbd className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded text-[10px]">Ctrl+K</kbd>
          </button>
          <button
            onClick={onUploadClick}
            className="flex items-center space-x-1.5 bg-white border border-borderCol hover:border-gray-400 px-3 py-1.5 rounded text-xs font-medium text-textDark transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-textMuted" />
            <span>Import Feeds</span>
          </button>
        </div>
      </div>
    </div>
  );
};
