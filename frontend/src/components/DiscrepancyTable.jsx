import React from 'react';
import { ChevronRight, ShieldCheck } from 'lucide-react';

export const DiscrepancyTable = ({ discrepancies, onSelectDiscrepancy, resolvedIds = [] }) => {
  if (!discrepancies || discrepancies.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-borderCol rounded font-mono text-xs">
        <ShieldCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
        <h3 className="font-semibold text-textDark">Zero Open Discrepancies</h3>
        <p className="text-textMuted mt-1">All financial records are balanced against bank feeds.</p>
      </div>
    );
  }

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-300';
      case 'MEDIUM': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'MDR_OVERCHARGE': return 'MDR Fee Overcharge';
      case 'DROPPED_WEBHOOK': return 'Dropped Webhook / Orphan';
      case 'SETTLEMENT_DELAY': return 'Settlement SLA Delay';
      case 'MISSING_GATEWAY_RECORD': return 'Missing Gateway Record';
      default: return type;
    }
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Section 03 Header */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-textDark">
        <div className="text-xs font-mono font-bold tracking-wider text-textDark uppercase">
          03 FORENSIC DISCREPANCIES &amp; RECOVERY QUEUE
        </div>
        <div className="text-xs font-mono font-bold tracking-wider text-textDark uppercase">
          ACTIVE ANOMALIES ({discrepancies.length})
        </div>
      </div>

      <div className="bg-white border border-borderCol rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-textMuted border-b border-borderCol text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-4">Discrepancy ID</th>
                <th className="py-2.5 px-4">Order Ref</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4">Impact Amount</th>
                <th className="py-2.5 px-4">Root Cause Summary</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderCol">
              {discrepancies.map((disc) => {
                const isResolved = resolvedIds.includes(disc.id);
                return (
                  <tr
                    key={disc.id}
                    className={`hover:bg-slate-50/80 transition-colors ${isResolved ? 'opacity-40 line-through' : ''}`}
                  >
                    <td className="py-3 px-4 font-semibold text-textDark">{disc.id}</td>
                    <td className="py-3 px-4 text-textMuted">{disc.order_id || 'N/A'}</td>
                    <td className="py-3 px-4 font-sans font-medium text-textDark">{getTypeLabel(disc.type)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] border font-semibold ${getSeverityBadge(disc.severity)}`}>
                        {disc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-red-600">
                      INR {disc.impact_amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-sans text-textMuted max-w-xs truncate">{disc.root_cause}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectDiscrepancy(disc)}
                        className="bg-navyDark hover:bg-navyHover text-white px-3 py-1 rounded text-[11px] font-mono uppercase tracking-wider transition-colors inline-flex items-center space-x-1"
                      >
                        <span>INVESTIGATE</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
