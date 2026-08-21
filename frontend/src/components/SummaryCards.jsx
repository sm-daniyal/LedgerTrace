import React, { useState } from 'react';
import { RefreshCw, Play, CheckCircle2, ChevronDown } from 'lucide-react';

export const SummaryCards = ({ metrics, onRunRecon, isRunning, selectedPreset, onSelectPreset, scanStage, lastUpdated }) => {
  if (!metrics) return null;

  return (
    <div className="space-y-4 mb-6">
      {/* Section 01 Header */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-textDark">
        <div className="text-xs font-mono font-bold tracking-wider text-textDark uppercase">
          01 INPUT
        </div>
        <div className="text-xs font-mono font-bold tracking-wider text-textDark uppercase">
          FINANCIAL FEEDS &amp; RECONCILIATION SETUP
        </div>
      </div>

      {/* Preset Selector & Quick Controls */}
      <div className="bg-white border border-borderCol rounded p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-textMuted uppercase font-semibold">SELECT SCENARIO PRESET:</span>
          <select
            value={selectedPreset}
            onChange={(e) => onSelectPreset(e.target.value)}
            disabled={isRunning}
            className="bg-slate-50 border border-borderCol text-textDark font-mono font-semibold py-1 px-2.5 rounded focus:outline-none focus:border-navyDark text-xs cursor-pointer"
          >
            <option value="default">Standard Batch (11 Orders, 4 Anomalies)</option>
            <option value="flash_sale">Flash Sale Surge (6 High-Value, Heavy Leakage)</option>
            <option value="clean">Month-End Audit (100% Matched, 0 Anomalies)</option>
          </select>
        </div>

        {lastUpdated && (
          <div className="text-[11px] font-mono text-textMuted flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
            <span>Last Reconciled: <strong className="text-textDark">{lastUpdated}</strong></span>
          </div>
        )}
      </div>

      {/* Dynamic Scan Progress Notification */}
      {isRunning && (
        <div className="bg-navyDark text-white p-3.5 rounded font-mono text-xs space-y-1.5 animate-pulse">
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center space-x-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span>{scanStage || 'Executing 3-way reconciliation pipeline...'}</span>
            </span>
            <span className="text-blue-300">PROCESSING</span>
          </div>
          <div className="w-full bg-navyHover h-1.5 rounded overflow-hidden">
            <div className="bg-blue-400 h-full w-3/4 animate-pulse"></div>
          </div>
        </div>
      )}

      {/* KPI Summary Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono">
        <div className="bg-white border border-borderCol p-3.5 rounded transition-all hover:border-slate-400">
          <div className="text-[10px] text-textMuted uppercase">RECONCILIATION RATE</div>
          <div className="text-2xl font-bold text-textDark mt-1 tracking-tight">{metrics.reconciliation_rate}%</div>
          <div className="text-[10px] text-textMuted mt-0.5">{metrics.reconciled_count} of {metrics.total_merchant_orders} orders matched</div>
        </div>

        <div className="bg-white border border-borderCol p-3.5 rounded transition-all hover:border-slate-400">
          <div className="text-[10px] text-textMuted uppercase">RECONCILED VOLUME</div>
          <div className="text-2xl font-bold text-textDark mt-1 tracking-tight">INR {metrics.reconciled_amount.toLocaleString()}</div>
          <div className="text-[10px] text-textMuted mt-0.5">Total Gross: INR {metrics.total_merchant_amount.toLocaleString()}</div>
        </div>

        <div className="bg-white border border-borderCol p-3.5 rounded transition-all hover:border-slate-400">
          <div className="text-[10px] text-textMuted uppercase">DETECTED FEE LEAKAGE</div>
          <div className="text-2xl font-bold text-red-600 mt-1 tracking-tight">INR {metrics.total_leakage_amount.toLocaleString()}</div>
          <div className="text-[10px] text-textMuted mt-0.5">MDR &amp; GST overcharges flagged</div>
        </div>

        <div className="bg-white border border-borderCol p-3.5 rounded transition-all hover:border-slate-400">
          <div className="text-[10px] text-textMuted uppercase">PENDING SETTLEMENTS</div>
          <div className="text-2xl font-bold text-amber-600 mt-1 tracking-tight">INR {metrics.pending_settlement_amount.toLocaleString()}</div>
          <div className="text-[10px] text-textMuted mt-0.5">SLA Breached (&gt;48h)</div>
        </div>
      </div>

      {/* Main Action Banner */}
      <button
        onClick={onRunRecon}
        disabled={isRunning}
        className="w-full bg-navyDark hover:bg-navyHover active:scale-[0.99] text-white font-mono font-bold text-xs tracking-wider uppercase py-3 rounded flex items-center justify-center space-x-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
        <span>{isRunning ? 'EXECUTING FORENSIC RECONCILIATION...' : 'RUN RECONCILIATION REPORT'}</span>
      </button>
    </div>
  );
};
