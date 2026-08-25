import React from 'react';
import { Search, UploadCloud, RefreshCw, Layers, ShieldCheck, Sparkles, Activity } from 'lucide-react';

export const Header = ({ onRefresh, onUploadClick, onOpenCommandPalette, isRunning }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-200/80">
      {/* Title & Tag */}
      <div>
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans">
            LedgerTrace Controller
          </h1>
          <span className="pro-badge bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono text-[10px]">
            AI RECON v2.0
          </span>
          <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
            Continuous Close Active
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 font-sans">
          Autonomous 3-Way Financial Lineage, Anomaly Detection &amp; Gated Double-Entry Resolution
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={onOpenCommandPalette}
          className="pro-btn pro-btn-secondary flex items-center space-x-2 text-slate-600"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-xs">Search UTR / Order</span>
          <kbd className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-200">
            Ctrl+K
          </kbd>
        </button>

        <button
          onClick={onUploadClick}
          className="pro-btn pro-btn-secondary flex items-center space-x-1.5 text-slate-700"
        >
          <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
          <span>Import CSV Feeds</span>
        </button>

        <button
          onClick={onRefresh}
          disabled={isRunning}
          className="pro-btn pro-btn-primary flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Reconciling...' : 'Run Reconciliation'}</span>
        </button>
      </div>
    </div>
  );
};

export default Header;
