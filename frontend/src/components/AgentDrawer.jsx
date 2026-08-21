import React, { useState } from 'react';
import { X, Cpu, CheckCircle2, FileCheck, Terminal, ShieldAlert } from 'lucide-react';
import { resolveWebhook, postJournalVoucher, generateDisputePacket } from '../services/api';

export const AgentDrawer = ({ discrepancy, onClose, onActionCompleted }) => {
  const [loadingAction, setLoadingAction] = useState(null);

  if (!discrepancy) return null;

  const handleResolveWebhook = async () => {
    setLoadingAction('webhook');
    try {
      const res = await resolveWebhook(discrepancy.order_id, discrepancy.gateway_payment_id);
      onActionCompleted({
        type: 'WEBHOOK_RESOLVED',
        discrepancyId: discrepancy.id,
        data: res
      });
    } catch (err) {
      alert('Failed to resolve webhook: ' + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePostJournal = async () => {
    setLoadingAction('journal');
    try {
      const res = await postJournalVoucher(
        discrepancy.id,
        discrepancy.type,
        discrepancy.impact_amount,
        discrepancy.order_id || 'GENERAL'
      );
      onActionCompleted({
        type: 'JOURNAL_POSTED',
        discrepancyId: discrepancy.id,
        data: res
      });
    } catch (err) {
      alert('Failed to post journal entry: ' + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGenerateDispute = async () => {
    setLoadingAction('dispute');
    try {
      const res = await generateDisputePacket(discrepancy);
      onActionCompleted({
        type: 'DISPUTE_GENERATED',
        discrepancyId: discrepancy.id,
        data: res
      });
    } catch (err) {
      alert('Failed to generate dispute dossier: ' + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white border-l border-borderCol shadow-2xl z-50 flex flex-col font-sans">
      <div className="p-5 border-b border-borderCol flex items-center justify-between bg-slate-50">
        <div>
          <h3 className="text-sm font-bold text-textDark uppercase font-mono">Autonomous Forensic Investigator</h3>
          <span className="text-xs font-mono text-textMuted">Discrepancy: {discrepancy.id}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded text-textMuted hover:text-textDark">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
        <div className="bg-slate-50 rounded border border-borderCol p-4 space-y-2 font-mono">
          <div className="flex justify-between items-center">
            <span className="text-textMuted">Discrepancy Type:</span>
            <span className="font-bold text-textDark">{discrepancy.type}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-textMuted">Impact Amount:</span>
            <span className="font-bold text-red-600">INR {discrepancy.impact_amount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-textMuted">Agent Confidence:</span>
            <span className="font-bold text-green-700">
              {Math.round(discrepancy.agent_confidence * 100)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-textMuted">Downstream Risk:</span>
            <span className="text-amber-700 font-semibold">{discrepancy.downstream_risk || 'Standard'}</span>
          </div>
        </div>

        <div>
          <h4 className="font-mono text-[10px] uppercase font-bold text-textDark mb-1">Issue Description</h4>
          <p className="text-textDark bg-slate-50 border border-borderCol p-3 rounded leading-relaxed font-sans">
            {discrepancy.description}
          </p>
        </div>

        <div>
          <h4 className="font-mono text-[10px] uppercase font-bold text-textDark mb-1">Root Cause Analysis</h4>
          <p className="text-textDark bg-slate-50 border border-borderCol p-3 rounded leading-relaxed font-sans">
            {discrepancy.root_cause}
          </p>
        </div>

        <div>
          <h4 className="font-mono text-[10px] uppercase font-bold text-textDark mb-1">Agent Investigation Trace</h4>
          <div className="bg-slate-900 text-slate-100 rounded p-3 font-mono text-[11px] space-y-2">
            {discrepancy.investigation_steps && discrepancy.investigation_steps.map((step, idx) => (
              <div key={idx} className="flex items-start space-x-2">
                <span className="text-blue-400">{idx + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-mono text-[10px] uppercase font-bold text-textDark mb-1">Proposed Resolution Action</h4>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 leading-relaxed font-sans font-medium">
            {discrepancy.proposed_action}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-borderCol bg-slate-50 flex items-center justify-end space-x-2 font-mono">
        <button onClick={onClose} className="px-3 py-1.5 rounded text-xs text-textMuted hover:text-textDark">
          CLOSE
        </button>

        {discrepancy.type === 'DROPPED_WEBHOOK' && (
          <button
            onClick={handleResolveWebhook}
            disabled={loadingAction !== null}
            className="px-4 py-2 rounded text-xs bg-navyDark hover:bg-navyHover text-white font-semibold uppercase disabled:opacity-50"
          >
            {loadingAction === 'webhook' ? 'RESYNCING...' : '1-CLICK WEBHOOK RESYNC'}
          </button>
        )}

        {discrepancy.type === 'MDR_OVERCHARGE' && (
          <>
            <button
              onClick={handlePostJournal}
              disabled={loadingAction !== null}
              className="px-3 py-2 rounded text-xs bg-white border border-borderCol hover:border-gray-400 text-textDark font-semibold uppercase disabled:opacity-50"
            >
              {loadingAction === 'journal' ? 'POSTING...' : 'POST JOURNAL VOUCHER'}
            </button>
            <button
              onClick={handleGenerateDispute}
              disabled={loadingAction !== null}
              className="px-4 py-2 rounded text-xs bg-navyDark hover:bg-navyHover text-white font-semibold uppercase disabled:opacity-50"
            >
              {loadingAction === 'dispute' ? 'EXPORTING...' : 'GENERATE DISPUTE CLAIM'}
            </button>
          </>
        )}

        {discrepancy.type === 'SETTLEMENT_DELAY' && (
          <button
            onClick={handlePostJournal}
            disabled={loadingAction !== null}
            className="px-4 py-2 rounded text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold uppercase disabled:opacity-50"
          >
            {loadingAction === 'journal' ? 'POSTING...' : 'POST SUSPENSE HOLD'}
          </button>
        )}
      </div>
    </div>
  );
};
