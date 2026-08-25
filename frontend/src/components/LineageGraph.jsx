import React, { useState } from 'react';
import { Layers, CreditCard, Landmark, CheckCircle2, AlertCircle, ArrowRight, GitBranch, Database } from 'lucide-react';

export const LineageGraph = ({ lineage, onSelectNode }) => {
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  if (!lineage || !lineage.nodes || lineage.nodes.length === 0) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs p-8 text-center font-sans text-xs text-slate-500 space-y-1.5">
        <GitBranch className="w-7 h-7 text-indigo-500 mx-auto mb-1" />
        <div className="font-semibold text-slate-900">Financial Provenance DAG Standing By</div>
        <div>Click &quot;Run Reconciliation&quot; or select a Scenario Preset above to construct the 4-tier money trail.</div>
      </div>
    );
  }

  const orders = lineage.nodes.filter(n => n.type === 'order' || n.stage === 'merchant');
  const gateways = lineage.nodes.filter(n => n.type === 'gateway' || n.stage === 'gateway');
  const batches = lineage.nodes.filter(n => n.type === 'payout_batch' || n.stage === 'settlement');
  const utrs = lineage.nodes.filter(n => n.type === 'bank_utr' || n.stage === 'bank');

  const handleNodeClick = (node) => {
    setSelectedNodeId(node.id);
    if (onSelectNode) onSelectNode(node);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs p-5 md:p-6 mb-6 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 mb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Financial DAG Lineage Topology
            </h2>
            <span className="pro-badge bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px]">
              4-TIER MONEY TRAIL
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive visual provenance graph tracing capital from Merchant Order &rarr; Gateway Capture &rarr; Settlement Batch &rarr; Bank UTR
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-medium">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block" /> Reconciled</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block" /> Flagged Discrepancy</span>
        </div>
      </div>

      {/* 4-Column Connected Pipeline */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-w-[760px] font-mono">
          {/* Stage 1: Merchant Orders */}
          <div className="space-y-2.5">
            <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs font-semibold uppercase flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-indigo-400" /> 1. Merchant Orders</span>
              <span className="bg-indigo-600 text-white px-1.5 py-0.2 rounded text-[10px]">{orders.length}</span>
            </div>

            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {orders.map((node) => {
                const isDisc = node.status === 'discrepancy' || node.status === 'PENDING';
                const isSelected = selectedNodeId === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isDisc
                        ? 'bg-rose-50/70 border-rose-200 hover:border-rose-400'
                        : 'bg-slate-50/70 border-slate-200/80 hover:border-indigo-300'
                    } ${isSelected ? 'ring-2 ring-indigo-600 bg-white shadow-xs' : ''}`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{node.label}</span>
                      <span>INR {Number(node.amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-sans">
                      <span>{node.metadata?.payment_method || node.details?.method || 'UPI / Card'}</span>
                      {isDisc ? (
                        <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-semibold font-mono text-[9px]">FLAGGED</span>
                      ) : (
                        <span className="text-emerald-700 font-semibold font-mono">MATCHED</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage 2: Gateway Captures */}
          <div className="space-y-2.5">
            <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs font-semibold uppercase flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-indigo-400" /> 2. Gateway Captures</span>
              <span className="bg-indigo-600 text-white px-1.5 py-0.2 rounded text-[10px]">{gateways.length}</span>
            </div>

            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {gateways.map((node) => {
                const isDisc = node.status === 'discrepancy';
                const isSelected = selectedNodeId === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isDisc
                        ? 'bg-amber-50/70 border-amber-200 hover:border-amber-400'
                        : 'bg-slate-50/70 border-slate-200/80 hover:border-indigo-300'
                    } ${isSelected ? 'ring-2 ring-indigo-600 bg-white shadow-xs' : ''}`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="truncate max-w-[100px]">{node.label}</span>
                      <span>Gross {node.amount}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-1">
                      Fee: {node.metadata?.fee ?? node.details?.fee ?? 0} | Tax: {node.metadata?.tax ?? node.details?.tax ?? 0}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage 3: Settlement Batches */}
          <div className="space-y-2.5">
            <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs font-semibold uppercase flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-indigo-400" /> 3. Settlement Batches</span>
              <span className="bg-indigo-600 text-white px-1.5 py-0.2 rounded text-[10px]">{batches.length}</span>
            </div>

            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {batches.map((node) => {
                const isSelected = selectedNodeId === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    className={`p-3 rounded-xl border bg-slate-50/70 border-slate-200/80 hover:border-indigo-300 text-xs cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-indigo-600 bg-white shadow-xs' : ''
                    }`}
                  >
                    <div className="font-bold text-slate-900">{node.label}</div>
                    <div className="text-[10px] text-slate-500 mt-1 font-sans">Multi-Order Net Settlement</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage 4: Bank UTR Credits */}
          <div className="space-y-2.5">
            <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs font-semibold uppercase flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5 text-indigo-400" /> 4. Bank UTR Credits</span>
              <span className="bg-indigo-600 text-white px-1.5 py-0.2 rounded text-[10px]">{utrs.length}</span>
            </div>

            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {utrs.map((node) => {
                const isSelected = selectedNodeId === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    className={`p-3 rounded-xl border bg-emerald-50/60 border-emerald-200/90 hover:border-emerald-400 text-xs cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-emerald-600 bg-white shadow-xs' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-emerald-950">
                      <span className="truncate max-w-[100px]">{node.label}</span>
                      <span>INR {Number(node.amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-1 font-sans">
                      {node.metadata?.narration || 'HDFC Bank Net Settlement'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LineageGraph;
