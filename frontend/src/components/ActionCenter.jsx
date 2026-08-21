import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export const ActionCenter = ({ actionLog }) => {
  if (!actionLog || actionLog.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between pb-2 border-b-2 border-textDark">
        <div className="text-xs font-mono font-bold tracking-wider text-textDark uppercase">
          04 EXECUTED ACTIONS &amp; AUDIT LOG
        </div>
        <div className="text-xs font-mono font-bold tracking-wider text-textDark uppercase">
          TOTAL COMPLETED: {actionLog.length}
        </div>
      </div>

      <div className="space-y-2">
        {actionLog.map((action, idx) => (
          <div
            key={idx}
            className="p-3 bg-white border border-borderCol rounded text-xs font-mono space-y-1"
          >
            <div className="flex items-center justify-between text-textDark font-semibold">
              <span className="text-green-700">{action.type}</span>
              <span className="text-textMuted text-[10px]">REF: {action.discrepancyId}</span>
            </div>

            {action.data.voucher_no && (
              <div>
                <span className="text-textMuted">VOUCHER NO: </span>
                <span className="text-blue-900 font-bold">{action.data.voucher_no}</span>
                <p className="text-[11px] text-textMuted font-sans mt-0.5">{action.data.narration}</p>
              </div>
            )}

            {action.data.dossier_id && (
              <div>
                <span className="text-textMuted">DISPUTE DOSSIER: </span>
                <span className="text-red-700 font-bold">{action.data.dossier_id}</span>
                <p className="text-[11px] text-textMuted font-sans mt-0.5">
                  Target: {action.data.target_gateway} | Claim Amount: INR {action.data.claimed_overcharge_amount}
                </p>
              </div>
            )}

            {action.data.event && (
              <div>
                <span className="text-textMuted">SYNTHETIC EVENT: </span>
                <span className="text-green-700 font-bold">{action.data.event}</span>
                <p className="text-[11px] text-textMuted font-sans mt-0.5">{action.data.response}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
