import React from 'react';
import { FileCheck, ShieldCheck, CheckCircle2, History, Database, ArrowRight } from 'lucide-react';

export const ActionCenter = ({ actionLog = [] }) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs p-6 mb-6 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 mb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Audit Ledger &amp; Journal Voucher Registry
            </h2>
            <span className="pro-badge bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px]">
              IMMUTABLE TRAIL
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically sealed double-entry journal vouchers, dispute dossiers, and webhook replays
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
            {actionLog.length} Executed Entries
          </span>
        </div>
      </div>

      {/* Table */}
      {actionLog.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 font-mono text-xs text-slate-500">
          <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="font-semibold text-slate-900">No Journal Actions Committed Yet</h3>
          <p className="text-slate-500 mt-1 font-sans">
            Execute 1-click self-healing in the Forensic Drawer or Approve actions in the Approval Hub to generate entries.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden font-mono text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4 font-semibold">Action Ref</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Target Entity</th>
                <th className="py-3 px-4 font-semibold">Voucher / Dossier ID</th>
                <th className="py-3 px-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {actionLog.map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 bg-white">
                  <td className="py-3 px-4 font-bold text-slate-900">ACT_{idx + 101}</td>
                  <td className="py-3 px-4">
                    <span className="pro-badge bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px]">
                      {log.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{log.discrepancyId}</td>
                  <td className="py-3 px-4 text-slate-900 font-medium font-mono">
                    {log.data?.voucher_no || log.data?.dossier_id || log.data?.execution_result?.voucher_no || 'COMMITTED_LEDGER_SYNC'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center text-emerald-700 font-semibold gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      COMMITTED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ActionCenter;
