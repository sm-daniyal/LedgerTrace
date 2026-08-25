import React from 'react';
import { CheckCircle2, AlertCircle, Clock, ShieldCheck, Activity } from 'lucide-react';

export const CloseCockpit = ({ closeStatus, metrics }) => {
  const closePct = closeStatus?.close_progress?.percentage ?? metrics?.reconciliation_rate ?? 63.6;
  const fullyReconciled = closeStatus?.close_progress?.fully_reconciled ?? metrics?.reconciled_count ?? 7;
  const totalOrders = closeStatus?.close_progress?.total_orders ?? metrics?.total_merchant_orders ?? 11;
  const openDiscs = closeStatus?.close_progress?.open_discrepancies ?? metrics?.discrepancy_count ?? 4;
  const anomalyCount = metrics?.anomaly_count ?? 2;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white rounded-xl p-4 md:p-5 mb-6 border border-slate-800 shadow-sm relative overflow-hidden">
      {/* Subtle Background Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

      <div className="relative z-10 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm md:text-base font-bold tracking-tight text-white font-sans">
                  Continuous Close Controller
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                  Zero-Day Close
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                Real-time 3-way synchronization active across Merchant DB, Gateway MIS, and Bank Feeds
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium font-mono">Reconciled Gross</div>
              <div className="text-base md:text-lg font-bold text-white font-mono">
                INR {Number(metrics?.reconciled_amount || 198000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium font-mono">Close Progress</div>
              <div className="text-base md:text-lg font-bold text-emerald-400 font-mono">{closePct}%</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700/50">
            <div
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(closePct, 5)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-0.5 font-sans">
            <div className="flex items-center space-x-4">
              <span className="flex items-center text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                {fullyReconciled} of {totalOrders} Orders Reconciled
              </span>
              <span className="flex items-center text-slate-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
                {openDiscs} Open Discrepancies
              </span>
              {anomalyCount > 0 && (
                <span className="flex items-center text-indigo-300">
                  <Activity className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
                  {anomalyCount} Statistical Anomalies
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>SLA Target: 48h (T+2 Settlement Window)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloseCockpit;
