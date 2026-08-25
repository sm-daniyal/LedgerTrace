import React from 'react';
import { DollarSign, Layers, Activity, Clock, Sliders, ArrowUpRight, TrendingUp, AlertTriangle, ShieldCheck, RefreshCw, CheckCircle2, RotateCcw } from 'lucide-react';

export const SummaryCards = ({ metrics, onRunRecon, isRunning, selectedPreset, onSelectPreset, onResetStandby, scanStage, lastUpdated }) => {
  if (!metrics) return null;

  const presets = [
    { id: 'default', label: 'Standard Batch', sub: '11 Orders, 4 Edge-Cases' },
    { id: 'flash_sale', label: 'Flash Sale Surge', sub: 'High Volume, Heavy Leakage' },
    { id: 'clean', label: 'Month-End Audit', sub: '100% Balanced Clean' }
  ];

  const isStandby = !selectedPreset || metrics.total_merchant_orders === 0;

  return (
    <div className="space-y-4 mb-6">
      {/* Simulation Scenario Preset Selector */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-tight font-sans flex items-center gap-2">
              <span>Simulation Scenario Preset</span>
              {isStandby && (
                <span className="px-2 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-medium">
                  AWAITING INGESTION
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 font-sans">
              Select transaction dataset to test 3-way reconciliation &amp; forensic agents
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p.id)}
              disabled={isRunning}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer ${
                selectedPreset === p.id
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span>{p.label}</span>
            </button>
          ))}

          {/* Reset Button */}
          {!isStandby && onResetStandby && (
            <button
              onClick={onResetStandby}
              title="Reset dashboard to clean initial standby state"
              className="px-2 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-white/60 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="text-[11px]">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Scan Progress Notification */}
      {isRunning && (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-md font-mono text-xs space-y-2">
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center space-x-2 text-indigo-300 font-sans">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>{scanStage || 'Executing 3-way reconciliation pipeline...'}</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
              PROCESSING
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full w-4/5 animate-pulse rounded-full" />
          </div>
        </div>
      )}

      {/* 4 Clean Pro-Enterprise Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Reconciled Volume */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-sans">Reconciled Gross</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
              INR {Number(metrics.reconciled_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-sans flex items-center justify-between">
              <span>Total Volume:</span>
              <span className="font-mono font-medium text-slate-700">INR {Number(metrics.total_merchant_amount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Match Rate */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-sans">Match Rate</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700 tracking-tight font-mono">
              {metrics.reconciliation_rate}%
            </div>
            <div className="text-xs text-slate-500 mt-1 font-sans flex items-center justify-between">
              <span>Matched Records:</span>
              <span className="font-mono font-medium text-slate-700">{metrics.reconciled_count} / {metrics.total_merchant_orders}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Fee Leakage */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 font-sans">Fee Leakage</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600 tracking-tight font-mono">
              INR {Number(metrics.total_leakage_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-sans flex items-center justify-between">
              <span>MDR &amp; Tax Overcharge:</span>
              <span className="font-mono font-semibold text-rose-600">{metrics.discrepancy_count} Flagged</span>
            </div>
          </div>
        </div>

        {/* Card 4: Pending SLA */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 font-sans">Pending SLA</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600 tracking-tight font-mono">
              INR {Number(metrics.pending_settlement_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-sans flex items-center justify-between">
              <span>Floating Beyond 48h:</span>
              <span className="font-mono font-semibold text-amber-600">T+2 Breached</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;
