import React from 'react';
import { Layers, Database, CreditCard, Landmark, GitBranch } from 'lucide-react';

export const LineageGraph = ({ lineage, onSelectNode }) => {
  if (!lineage || !lineage.nodes) {
    return (
      <div className="p-8 text-center text-textMuted border border-borderCol rounded bg-white font-mono text-xs">
        Loading financial provenance topology...
      </div>
    );
  }

  const orders = lineage.nodes.filter(n => n.type === 'order');
  const gateways = lineage.nodes.filter(n => n.type === 'gateway');
  const batches = lineage.nodes.filter(n => n.type === 'payout_batch');
  const utrs = lineage.nodes.filter(n => n.type === 'bank_utr');

  return (
    <div className="space-y-4 mb-6">
      {/* Section 02 Header */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-textDark">
        <div className="text-xs font-mono font-bold tracking-wider text-textDark uppercase">
          02 PATHWAYS &amp; NETWORK SPREAD
        </div>
        <div className="text-xs font-mono font-bold tracking-wider text-textDark uppercase">
          TRANSACTION PROVENANCE TOPOLOGY
        </div>
      </div>

      <div className="text-[11px] font-mono text-textMuted uppercase tracking-wider">
        FINANCIAL SUBGRAPH VISUALIZATION
      </div>

      {/* Multi-Column Stage Canvas */}
      <div className="bg-white border border-borderCol rounded p-4 overflow-x-auto min-w-[700px]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Stage 1: Merchant Orders */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono text-textMuted uppercase tracking-wider pb-1 border-b border-borderCol flex items-center justify-between">
              <span>1. Merchant Orders</span>
              <span className="font-semibold text-textDark">{orders.length}</span>
            </div>
            {orders.map(node => {
              const isDisc = node.status === 'discrepancy';
              return (
                <div
                  key={node.id}
                  onClick={() => onSelectNode(node)}
                  className={`p-2.5 rounded border text-xs cursor-pointer transition-all hover:translate-x-0.5 font-mono ${
                    isDisc
                      ? 'bg-red-50/70 border-red-300 text-red-900 hover:border-red-500'
                      : 'bg-slate-50/60 border-borderCol text-textDark hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>{node.label}</span>
                    <span>INR {node.amount.toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-textMuted mt-1 flex items-center justify-between">
                    <span>{node.metadata?.payment_method}</span>
                    {isDisc && <span className="text-red-700 font-bold">FLAGGED</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stage 2: Gateway Captures */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono text-textMuted uppercase tracking-wider pb-1 border-b border-borderCol flex items-center justify-between">
              <span>2. Gateway Captures</span>
              <span className="font-semibold text-textDark">{gateways.length}</span>
            </div>
            {gateways.map(node => {
              const isDisc = node.status === 'discrepancy';
              return (
                <div
                  key={node.id}
                  onClick={() => onSelectNode(node)}
                  className={`p-2.5 rounded border text-xs cursor-pointer transition-all hover:translate-x-0.5 font-mono ${
                    isDisc
                      ? 'bg-red-50/70 border-red-300 text-red-900 hover:border-red-500'
                      : 'bg-slate-50/60 border-borderCol text-textDark hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>{node.label}</span>
                    <span>Gross {node.amount}</span>
                  </div>
                  <div className="text-[10px] text-textMuted mt-1 flex items-center justify-between">
                    <span>Fee: {node.metadata?.fee} | Tax: {node.metadata?.tax}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stage 3: Settlement Batches */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono text-textMuted uppercase tracking-wider pb-1 border-b border-borderCol flex items-center justify-between">
              <span>3. Settlement Batches</span>
              <span className="font-semibold text-textDark">{batches.length}</span>
            </div>
            {batches.map(node => (
              <div
                key={node.id}
                onClick={() => onSelectNode(node)}
                className="p-2.5 rounded border bg-slate-50/60 border-borderCol text-xs text-textDark cursor-pointer hover:border-slate-400 transition-all hover:translate-x-0.5 font-mono"
              >
                <div className="font-semibold text-blue-900">{node.label}</div>
                <div className="text-[10px] text-textMuted mt-1">Multi-Order Net Deposit</div>
              </div>
            ))}
          </div>

          {/* Stage 4: Bank UTRs */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono text-textMuted uppercase tracking-wider pb-1 border-b border-borderCol flex items-center justify-between">
              <span>4. Bank UTR Credits</span>
              <span className="font-semibold text-textDark">{utrs.length}</span>
            </div>
            {utrs.map(node => (
              <div
                key={node.id}
                onClick={() => onSelectNode(node)}
                className="p-2.5 rounded border bg-green-50/40 border-green-300 text-xs text-textDark cursor-pointer hover:border-green-500 transition-all hover:translate-x-0.5 font-mono"
              >
                <div className="flex items-center justify-between font-semibold text-green-900">
                  <span className="truncate max-w-[100px]">{node.label}</span>
                  <span>INR {node.amount.toLocaleString()}</span>
                </div>
                <div className="text-[10px] text-textMuted mt-1 truncate">
                  {node.metadata?.narration}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
