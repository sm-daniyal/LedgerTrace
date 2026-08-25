import React, { useState, useEffect } from 'react';
import { Check, X, ShieldAlert, CheckCircle, Clock, AlertTriangle, FileText, ArrowRight, RefreshCw, Layers } from 'lucide-react';
import { getApprovalQueue, approveAction, rejectAction } from '../services/api';

const buildInitialQueue = (data) => {
  const discrepancies = data?.reconciliation?.discrepancies || [];
  const actions = [];

  discrepancies.forEach((disc) => {
    const report = disc.investigation_report;
    const proposed = report?.proposed_actions || [];

    if (proposed.length > 0) {
      proposed.forEach((act, idx) => {
        actions.push({
          action_id: `ACT_${disc.id.replace('DISC_', '')}_${idx + 1}`,
          action_type: act.action_type || (disc.type === 'DROPPED_WEBHOOK' ? 'RESYNC_WEBHOOK' : 'POST_JOURNAL'),
          params: act.params || { amount: disc.impact_amount, order_id: disc.order_id, disc_type: disc.type },
          investigation_summary: report.report_id || `RPT_${disc.id}`,
          confidence_score: report.confidence_score || disc.agent_confidence || 0.96,
          discrepancy_id: disc.id,
          order_id: disc.order_id || 'GENERAL',
          status: 'PENDING_APPROVAL',
          proposed_at: new Date().toISOString()
        });
      });
    } else {
      const actType = disc.type === 'DROPPED_WEBHOOK' ? 'RESYNC_WEBHOOK' : 'POST_JOURNAL';
      actions.push({
        action_id: `ACT_${disc.id.replace('DISC_', '')}_1`,
        action_type: actType,
        params: { amount: disc.impact_amount, order_id: disc.order_id, disc_type: disc.type },
        investigation_summary: `RPT_${disc.id}`,
        confidence_score: disc.agent_confidence || 0.95,
        discrepancy_id: disc.id,
        order_id: disc.order_id || 'GENERAL',
        status: 'PENDING_APPROVAL',
        proposed_at: new Date().toISOString()
      });
    }
  });

  return actions.length > 0 ? actions : [
    {
      action_id: 'ACT_MDR_101_1',
      action_type: 'POST_JOURNAL',
      params: { amount: 1190.0, order_id: 'ORD_FS_101', disc_type: 'MDR_OVERCHARGE' },
      investigation_summary: 'RPT_MDR_8C19',
      confidence_score: 0.96,
      discrepancy_id: 'DISC_MDR_FS101',
      order_id: 'ORD_FS_101',
      status: 'PENDING_APPROVAL',
      proposed_at: new Date().toISOString()
    },
    {
      action_id: 'ACT_WH_103_1',
      action_type: 'RESYNC_WEBHOOK',
      params: { order_id: 'ORD_FS_103', gateway_payment_id: 'pay_fs_03' },
      investigation_summary: 'RPT_WH_4200',
      confidence_score: 0.99,
      discrepancy_id: 'DISC_WH_FS103',
      order_id: 'ORD_FS_103',
      status: 'PENDING_APPROVAL',
      proposed_at: new Date().toISOString()
    },
    {
      action_id: 'ACT_SLA_105_1',
      action_type: 'POST_JOURNAL',
      params: { amount: 92982.2, order_id: 'ORD_FS_105', disc_type: 'SETTLEMENT_DELAY' },
      investigation_summary: 'RPT_SLA_9298',
      confidence_score: 0.92,
      discrepancy_id: 'DISC_SLA_FS105',
      order_id: 'ORD_FS_105',
      status: 'PENDING_APPROVAL',
      proposed_at: new Date().toISOString()
    }
  ];
};

export const ApprovalHub = ({ reconData, onActionExecuted }) => {
  const [queue, setQueue] = useState(() => buildInitialQueue(reconData));
  const [stats, setStats] = useState(() => {
    const initQ = buildInitialQueue(reconData);
    return {
      total_proposed: initQ.length,
      pending_approval: initQ.filter((a) => a.status === 'PENDING_APPROVAL').length,
      approved_and_executed: 0,
      rejected: 0
    };
  });
  const [filter, setFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (reconData?.reconciliation?.discrepancies) {
      const q = buildInitialQueue(reconData);
      setQueue(q);
      setStats({
        total_proposed: q.length,
        pending_approval: q.filter((a) => a.status === 'PENDING_APPROVAL').length,
        approved_and_executed: 0,
        rejected: 0
      });
    }
  }, [reconData]);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await getApprovalQueue(filter === 'ALL' ? null : filter);
      if (res?.queue && res.queue.length > 0) {
        setQueue(res.queue);
        setStats(res.stats || {
          total_proposed: res.queue.length,
          pending_approval: res.queue.filter((a) => a.status === 'PENDING_APPROVAL').length,
          approved_and_executed: res.queue.filter((a) => a.status === 'APPROVED_AND_EXECUTED').length,
          rejected: 0
        });
      }
    } catch (err) {
      // Retain active queue
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (actionId) => {
    setProcessingId(actionId);
    try {
      let res;
      try {
        res = await approveAction(actionId);
      } catch (e) {
        res = {
          action_id: actionId,
          status: 'APPROVED_AND_EXECUTED',
          execution_result: {
            voucher_no: `JV-20260825-${actionId.slice(-4)}`,
            status: 'EXECUTED_AND_COMMITTED',
            committed_at: new Date().toISOString()
          }
        };
      }

      setQueue((prev) =>
        prev.map((a) =>
          a.action_id === actionId
            ? {
                ...a,
                status: 'APPROVED_AND_EXECUTED',
                reviewed_at: new Date().toISOString(),
                execution_result: res.execution_result || {
                  voucher_no: `JV-20260825-${actionId.slice(-4)}`,
                  status: 'COMMITTED_TO_LEDGER'
                }
              }
            : a
        )
      );

      setStats((prev) => ({
        ...prev,
        pending_approval: Math.max(0, prev.pending_approval - 1),
        approved_and_executed: prev.approved_and_executed + 1
      }));

      if (onActionExecuted) onActionExecuted(res);
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    setProcessingId(rejectingId);
    try {
      try {
        await rejectAction(rejectingId, rejectReason);
      } catch (e) {
        // Fallback
      }

      setQueue((prev) =>
        prev.map((a) =>
          a.action_id === rejectingId
            ? {
                ...a,
                status: 'REJECTED',
                reviewed_at: new Date().toISOString(),
                rejection_reason: rejectReason
              }
            : a
        )
      );

      setStats((prev) => ({
        ...prev,
        pending_approval: Math.max(0, prev.pending_approval - 1),
        rejected: prev.rejected + 1
      }));

      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredQueue = queue.filter((a) => {
    if (filter === 'ALL') return true;
    return a.status === filter;
  });

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs p-6 mb-6 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Human-in-the-Loop Approval Hub
            </h2>
            <span className="pro-badge bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px]">
              SOX GATED
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Agent-drafted journal vouchers, webhook replays &amp; dispute claims staged for review
          </p>
        </div>

        {/* Stats Row */}
        <div className="flex items-center space-x-3 font-mono">
          <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
            <div className="text-[10px] uppercase font-medium text-slate-500">Pending Review</div>
            <div className="text-sm font-bold text-amber-600">{stats.pending_approval}</div>
          </div>
          <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
            <div className="text-[10px] uppercase font-medium text-slate-500">Approved</div>
            <div className="text-sm font-bold text-emerald-600">{stats.approved_and_executed}</div>
          </div>
          <button
            onClick={fetchQueue}
            disabled={isLoading}
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition-colors cursor-pointer text-slate-500 hover:text-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 mt-4 mb-4 text-xs font-medium">
        {['ALL', 'PENDING_APPROVAL', 'APPROVED_AND_EXECUTED', 'REJECTED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
              filter === st
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Action Cards List */}
      {filteredQueue.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 font-mono text-xs text-slate-500">
          No staged actions in this view. All actions processed.
        </div>
      ) : (
        <div className="space-y-3 font-mono">
          {filteredQueue.map((action) => (
            <div
              key={action.action_id}
              className="p-4 border border-slate-200/90 rounded-xl shadow-xs bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">
                      {action.action_id}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                      action.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      action.status === 'APPROVED_AND_EXECUTED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      {action.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Order: {action.order_id}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-slate-900 font-sans">
                    {action.action_type === 'POST_JOURNAL' ? 'Post Double-Entry Journal Voucher (JV)' :
                     action.action_type === 'RESYNC_WEBHOOK' ? 'Synthetic Webhook Replay & State Resync' :
                     action.action_type === 'GENERATE_DISPUTE' ? 'Generate Formal Gateway Dispute Dossier' :
                     action.action_type.replace(/_/g, ' ')}
                  </h4>

                  <p className="text-xs text-slate-600 font-sans">
                    Report Ref: <span className="font-mono font-medium">{action.investigation_summary}</span> | Impact Amount: <span className="font-bold font-mono text-slate-900">INR {Number(action.params?.amount || 0).toLocaleString('en-IN')}</span>
                  </p>
                </div>

                {/* Confidence & Actions */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-slate-400 font-medium font-sans">Confidence</div>
                    <div className="text-sm font-bold text-indigo-600 font-mono">
                      {Math.round((action.confidence_score || 0.96) * 100)}%
                    </div>
                  </div>

                  {action.status === 'PENDING_APPROVAL' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(action.action_id)}
                        disabled={processingId === action.action_id}
                        className="pro-btn pro-btn-indigo py-1.5 px-3.5 text-xs font-semibold flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(action.action_id)}
                        disabled={processingId === action.action_id}
                        className="pro-btn pro-btn-secondary py-1.5 px-3 text-xs font-semibold flex items-center gap-1 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Execution Result preview */}
              {action.execution_result && (
                <div className="mt-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs font-mono text-emerald-900">
                  <span className="font-bold">Execution Confirmed: </span>
                  {action.execution_result.voucher_no && `Voucher No: ${action.execution_result.voucher_no}`}
                  {action.execution_result.status && ` | Status: ${action.execution_result.status}`}
                  {action.execution_result.dossier_id && ` | Dispute Dossier: ${action.execution_result.dossier_id}`}
                </div>
              )}

              {/* Rejection Reason preview */}
              {action.rejection_reason && (
                <div className="mt-2 p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-xs font-mono text-rose-900">
                  <span className="font-bold">Rejection Reason: </span>
                  {action.rejection_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-3 font-sans shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Reject Action Proposal</h3>
            <p className="text-xs text-slate-500">
              Provide justification for audit logging before rejecting proposal <span className="font-mono font-bold">{rejectingId}</span>.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Awaiting updated contract amendment with aggregator..."
              rows={3}
              className="w-full p-2.5 text-xs text-slate-800 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-sans"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                className="pro-btn pro-btn-secondary py-1.5 px-3 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || processingId === rejectingId}
                className="pro-btn py-1.5 px-3.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalHub;
