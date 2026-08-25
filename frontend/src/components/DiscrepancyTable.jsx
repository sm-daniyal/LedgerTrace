import React, { useState } from 'react';
import { ChevronRight, ShieldCheck, AlertTriangle, Activity, Filter, ArrowUpRight } from 'lucide-react';

export const DiscrepancyTable = ({ discrepancies = [], anomalyAlerts = [], onSelectDiscrepancy, resolvedIds = [] }) => {
  const [activeFilter, setActiveFilter] = useState('ALL');

  const filteredDiscrepancies = discrepancies.filter((d) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'MDR' && d.type === 'MDR_OVERCHARGE') return true;
    if (activeFilter === 'WEBHOOK' && d.type === 'DROPPED_WEBHOOK') return true;
    if (activeFilter === 'SLA' && d.type === 'SETTLEMENT_DELAY') return true;
    return false;
  });

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'HIGH':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'MDR_OVERCHARGE': return 'MDR Fee Overcharge';
      case 'DROPPED_WEBHOOK': return 'Dropped Webhook (Orphan)';
      case 'SETTLEMENT_DELAY': return 'Settlement SLA Delay';
      case 'MISSING_GATEWAY_RECORD': return 'Missing Gateway Record';
      default: return type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs p-5 md:p-6 mb-6 font-sans">
      {/* Table Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Forensic Discrepancies &amp; Anomaly Queue
            </h2>
            <span className="pro-badge bg-rose-50 text-rose-700 border border-rose-200 font-mono text-[11px]">
              {discrepancies.length} ACTIVE ISSUES
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic rule violations and statistical anomalies flagged for forensic resolution
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-medium">
          {[
            { id: 'ALL', label: 'All Issues' },
            { id: 'MDR', label: 'MDR Overcharges' },
            { id: 'WEBHOOK', label: 'Dropped Webhooks' },
            { id: 'SLA', label: 'Settlement Delays' }
          ].map((flt) => (
            <button
              key={flt.id}
              onClick={() => setActiveFilter(flt.id)}
              className={`px-3 py-1 rounded-md transition-all duration-150 cursor-pointer ${
                activeFilter === flt.id
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {flt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Discrepancies Table */}
      {filteredDiscrepancies.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 font-mono text-xs my-4 space-y-1.5">
          <ShieldCheck className="w-8 h-8 text-indigo-600 mx-auto mb-1" />
          <h3 className="font-semibold text-slate-900 font-sans">
            {discrepancies.length === 0 ? 'Reconciliation Pipeline Standing By' : 'Zero Open Discrepancies in This View'}
          </h3>
          <p className="text-slate-500 font-sans text-xs">
            {discrepancies.length === 0
              ? 'Click "Run Reconciliation" or select a Scenario Preset above to begin 3-way matching.'
              : 'All financial records in this category are balanced.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4 font-semibold">Discrepancy Ref</th>
                <th className="py-3 px-4 font-semibold">Order ID</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Severity</th>
                <th className="py-3 px-4 font-semibold text-right">Impact Amount</th>
                <th className="py-3 px-4 font-semibold">Root Cause Diagnostic</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDiscrepancies.map((disc) => {
                const isResolved = resolvedIds.includes(disc.id);
                return (
                  <tr
                    key={disc.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isResolved ? 'opacity-40 line-through bg-emerald-50/30' : 'bg-white'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{disc.id}</td>
                    <td className="py-3.5 px-4 text-slate-600">{disc.order_id || 'N/A'}</td>
                    <td className="py-3.5 px-4 font-sans font-medium text-slate-800">
                      {getTypeLabel(disc.type)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] border font-semibold ${getSeverityBadge(disc.severity)}`}>
                        {disc.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-600 font-mono">
                      INR {Number(disc.impact_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-600 max-w-xs truncate">
                      {disc.root_cause}
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <button
                        onClick={() => onSelectDiscrepancy(disc)}
                        className="pro-btn pro-btn-indigo py-1.5 px-3 text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
                      >
                        <span>Investigate</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Statistical Anomaly Radar Cards */}
      {anomalyAlerts && anomalyAlerts.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-200/80">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Statistical Anomaly Radar ({anomalyAlerts.length} Flagged)
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {anomalyAlerts.map((alert, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-1.5 text-xs font-mono"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 text-xs">
                    {alert.alert_type}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getSeverityBadge(alert.severity)}`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-slate-700 font-sans leading-relaxed text-xs">
                  {alert.description}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-indigo-100/60">
                  <span>Observed: {alert.metric_observed}</span>
                  <span>Expected: {alert.metric_expected}</span>
                  <span>Deviation: {alert.deviation_score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscrepancyTable;
