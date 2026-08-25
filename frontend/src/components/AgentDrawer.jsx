import React, { useState } from 'react';
import { X, Cpu, CheckCircle2, FileCheck, Terminal, ShieldAlert, Clock, Sparkles, AlertTriangle, ArrowRight, Layers, Hash } from 'lucide-react';
import { resolveWebhook, postJournalVoucher, generateDisputePacket } from '../services/api';

export const AgentDrawer = ({ discrepancy, onClose, onActionCompleted }) => {
  const [loadingAction, setLoadingAction] = useState(null);
  const [activeTab, setActiveTab] = useState('REASONING'); // REASONING | HYPOTHESES | RISK

  if (!discrepancy) return null;

  const report = discrepancy.investigation_report;
  const steps = report?.steps || [];
  const hypotheses = report?.hypotheses || [];
  const selectedHypothesis = report?.selected_hypothesis;
  const confidenceScore = Math.round((report?.confidence_score ?? discrepancy.agent_confidence ?? 0.95) * 100);
  const auditHash = report?.audit_hash || 'SHA256-GATED';

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
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white border-l border-slate-200 shadow-drawer z-50 flex flex-col font-sans">
      {/* Drawer Header */}
      <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold tracking-tight text-white font-sans">
                Autonomous Forensic Investigator
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                {auditHash}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">Discrepancy Ref: {discrepancy.id}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Highlight Strip */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 grid grid-cols-4 gap-2 text-center text-xs">
        <div>
          <div className="text-[10px] uppercase text-slate-500 font-bold font-mono">Type</div>
          <div className="font-semibold text-slate-900 truncate mt-0.5 font-mono text-[11px]">{discrepancy.type}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-slate-500 font-bold font-mono">Impact</div>
          <div className="font-bold text-rose-600 mt-0.5 font-mono">INR {Number(discrepancy.impact_amount || 0).toLocaleString('en-IN')}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-slate-500 font-bold font-mono">Confidence</div>
          <div className="font-bold text-emerald-600 mt-0.5 font-mono">{confidenceScore}%</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-slate-500 font-bold font-mono">Risk Level</div>
          <div className="font-semibold text-amber-700 mt-0.5 truncate text-[11px]">
            {discrepancy.downstream_risk?.split(' - ')[0] || 'MEDIUM'}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-6">
        {[
          { id: 'REASONING', label: `Investigation Steps (${steps.length || 3})` },
          { id: 'HYPOTHESES', label: `Hypotheses & Ranking (${hypotheses.length || 2})` },
          { id: 'RISK', label: 'Downstream Risk' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Drawer Body */}
      <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
        {/* Tab 1: Reasoning Chain Timeline */}
        {activeTab === 'REASONING' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed font-sans">
              <span className="font-bold text-slate-900 block mb-1">Issue Overview:</span>
              {discrepancy.description}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-mono">
                <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                Deterministic Agent Execution Trace
              </h4>

              {steps.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-indigo-200 space-y-4">
                  {steps.map((step, idx) => (
                    <div key={idx} className="relative group">
                      {/* Timeline marker */}
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center text-[9px] font-bold text-indigo-600">
                        {idx + 1}
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 hover:border-indigo-200 transition-colors space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-indigo-950">
                            tool_call: {step.tool_name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {step.duration_ms || 12}ms
                          </span>
                        </div>

                        <p className="text-slate-700 font-sans text-xs leading-relaxed font-medium">
                          {step.reasoning}
                        </p>

                        <div className="bg-slate-900 rounded-lg p-2.5 text-slate-200 font-mono text-[10px] overflow-x-auto space-y-1">
                          <div className="text-slate-400">// Output:</div>
                          <div>{JSON.stringify(step.tool_output, null, 2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-[11px] space-y-2">
                  {discrepancy.investigation_steps?.map((step, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="text-indigo-400 font-bold">{idx + 1}.</span>
                      <span className="text-slate-200">{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Hypotheses & Ranking */}
        {activeTab === 'HYPOTHESES' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              Evaluated Root-Cause Hypotheses
            </h4>

            {hypotheses.length > 0 ? (
              <div className="space-y-3">
                {hypotheses.map((h, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      idx === 0
                        ? 'bg-indigo-50/50 border-indigo-300 shadow-xs'
                        : 'bg-slate-50 border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        idx === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {idx === 0 ? 'Primary Selected Hypothesis' : `Alternative #${idx}`}
                      </span>
                      <span className="font-mono font-bold text-xs text-indigo-900">
                        {Math.round((h.probability || 0.85) * 100)}% Probability
                      </span>
                    </div>

                    <h5 className="font-semibold text-slate-900 text-xs mb-1.5 font-sans">
                      {h.hypothesis}
                    </h5>

                    {/* Probability Meter */}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-3 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{ width: `${Math.round((h.probability || 0.85) * 100)}%` }}
                      />
                    </div>

                    {h.supporting_evidence && (
                      <div className="space-y-1 text-[11px] text-slate-600 font-sans">
                        <span className="font-medium text-slate-700">Supporting Evidence:</span>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {h.supporting_evidence.map((ev, i) => (
                            <li key={i}>{ev}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-bold text-slate-900 block mb-1">Root Cause Diagnosis:</span>
                <p className="text-slate-700 font-sans">{discrepancy.root_cause}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Downstream Risk */}
        {activeTab === 'RISK' && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm font-sans">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Downstream Cashflow Risk Assessment
              </div>
              <p className="text-xs text-amber-800 leading-relaxed font-sans">
                {discrepancy.downstream_risk || 'Standard operational variance. No immediate vendor disbursement disruption expected.'}
              </p>
            </div>
          </div>
        )}

        {/* Proposed Resolution Callout */}
        <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900 uppercase font-mono">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Agent Proposed Self-Healing Action:
          </div>
          <p className="text-indigo-950 font-medium text-xs leading-relaxed font-sans">
            {discrepancy.proposed_action}
          </p>
        </div>
      </div>

      {/* Drawer Action Bar */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between font-sans">
        <button
          onClick={onClose}
          className="pro-btn pro-btn-secondary py-2 px-4 text-xs font-semibold"
        >
          Dismiss
        </button>

        <div className="flex items-center space-x-2">
          {discrepancy.type === 'DROPPED_WEBHOOK' && (
            <button
              onClick={handleResolveWebhook}
              disabled={loadingAction !== null}
              className="pro-btn pro-btn-indigo py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              {loadingAction === 'webhook' ? 'Resyncing...' : 'Execute 1-Click Webhook Replay'}
            </button>
          )}

          {discrepancy.type === 'MDR_OVERCHARGE' && (
            <>
              <button
                onClick={handlePostJournal}
                disabled={loadingAction !== null}
                className="pro-btn pro-btn-secondary py-2 px-3.5 text-xs font-semibold"
              >
                {loadingAction === 'journal' ? 'Posting...' : 'Post Adjusting JV'}
              </button>
              <button
                onClick={handleGenerateDispute}
                disabled={loadingAction !== null}
                className="pro-btn pro-btn-indigo py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
              >
                {loadingAction === 'dispute' ? 'Exporting...' : 'Generate Dispute Dossier'}
              </button>
            </>
          )}

          {discrepancy.type === 'SETTLEMENT_DELAY' && (
            <button
              onClick={handlePostJournal}
              disabled={loadingAction !== null}
              className="pro-btn py-2 px-4 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            >
              {loadingAction === 'journal' ? 'Posting...' : 'Post Suspense Hold Voucher'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentDrawer;
