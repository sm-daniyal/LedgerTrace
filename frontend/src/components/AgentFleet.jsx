import React, { useState } from 'react';
import { 
  ShieldAlert, Clock, TrendingUp, RefreshCw, FileCheck, 
  Zap, ChevronRight 
} from 'lucide-react';

export const AgentFleet = ({ reconData, onSelectDiscrepancy, onNavigateToApproval }) => {
  const [executedAgentId, setExecutedAgentId] = useState(null);

  const discrepancies = reconData?.reconciliation?.discrepancies || [];
  const metrics = reconData?.reconciliation?.metrics;

  const agents = [
    {
      id: 'DISPUTE_COMPILER',
      name: 'MDR Dispute Dossier Compiler',
      category: 'REVENUE PROTECTION',
      status: 'ACTIVE',
      description: 'Autonomous evidence compiler for aggregator fee variance, rate card drift, and uncontracted surcharges.',
      badge: 'Dispute Engine',
      stats: {
        metric: 'INR 1,845.00',
        label: 'Recoverable Leakage',
        statusText: '1 Dossier Staged'
      },
      icon: ShieldAlert,
      iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      actionLabel: 'Inspect Evidence Dossier',
      targetDiscType: 'MDR_OVERCHARGE'
    },
    {
      id: 'SETTLEMENT_MONITOR',
      name: 'Settlement SLA Velocity Monitor',
      category: 'SLA WATCHDOG',
      status: 'ACTIVE',
      description: 'Continuous monitoring of bank clearing velocity, rolling risk reserve holds, and T+2 48h settlement float.',
      badge: 'Batch Recon',
      stats: {
        metric: 'INR 92,982.20',
        label: 'Floating Beyond 48h',
        statusText: '1 SLA Breach Flagged'
      },
      icon: Clock,
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      actionLabel: 'Inspect SLA Queue',
      targetDiscType: 'SETTLEMENT_DELAY'
    },
    {
      id: 'TREASURY_ANALYZER',
      name: 'Treasury Cashflow Risk Analyzer',
      category: 'LIQUIDITY RISK',
      status: 'ACTIVE',
      description: 'Bayesian liquidity impact modeling isolating trapped capital to protect scheduled vendor disbursements.',
      badge: 'Treasury Risk',
      stats: {
        metric: 'HIGH RISK',
        label: 'Vendor Disbursement Risk',
        statusText: 'P&L Impact Bound'
      },
      icon: TrendingUp,
      iconColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      actionLabel: 'View Risk Matrix',
      targetDiscType: null
    },
    {
      id: 'WEBHOOK_ORCHESTRATOR',
      name: 'Synthetic Webhook Orchestrator',
      category: 'EVENT RESYNC',
      status: 'ACTIVE',
      description: 'Heals orphan orders stuck in PENDING from HTTP 504 gateway timeouts via verified synthetic replay.',
      badge: 'Event Recovery',
      stats: {
        metric: '1 Orphan Order',
        label: 'Captured at Gateway',
        statusText: 'Ready for Replay'
      },
      icon: RefreshCw,
      iconColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      actionLabel: 'Replay State Event',
      targetDiscType: 'DROPPED_WEBHOOK'
    },
    {
      id: 'DOUBLE_ENTRY_ENGINE',
      name: 'Double-Entry Ledger Voucher Engine',
      category: 'SOX ACCOUNTING',
      status: 'ACTIVE',
      description: 'Auto-generates balanced debit/credit adjusting journal vouchers bounded by strict deterministic math invariants.',
      badge: 'SOX Gated',
      stats: {
        metric: '100% INVARIANT',
        label: 'Deterministic Precision',
        statusText: 'ERP Ready (SAP / NetSuite)'
      },
      icon: FileCheck,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      actionLabel: 'Open Approval Queue',
      targetDiscType: null
    }
  ];

  const handleRunAgent = (agent) => {
    setExecutedAgentId(agent.id);
    setTimeout(() => {
      setExecutedAgentId(null);
      if (agent.targetDiscType && onSelectDiscrepancy) {
        const match = discrepancies.find((d) => d.type === agent.targetDiscType);
        if (match) {
          onSelectDiscrepancy(match);
          return;
        }
      }
      if (onNavigateToApproval) {
        onNavigateToApproval();
      }
    }, 350);
  };

  return (
    <div className="space-y-6">
      {/* Autonomous Ops Fleet Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2.5">
              <span className="font-mono text-xs font-semibold text-indigo-400 tracking-wider">
                AUTONOMOUS RESOLUTION FLEET
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                5 AGENTS OPERATIONAL
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-sans">
              Specialized Forensic &amp; Accounting Agents
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed font-sans">
              Autonomous sub-agents for exception investigation, fee dispute compilation, 
              and SOX-gated double-entry reconciliation across multi-aggregator transaction streams.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-3 text-right">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-medium">Recon Coverage</div>
              <div className="text-lg font-bold text-white font-mono">{metrics?.reconciliation_rate || 0}%</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-3 text-right">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-medium">Open Exceptions</div>
              <div className="text-lg font-bold text-rose-400 font-mono">{discrepancies.length} Issues</div>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const Icon = agent.icon;
          const isTriggering = executedAgentId === agent.id;

          return (
            <div
              key={agent.id}
              className="bg-white border border-slate-200/90 hover:border-indigo-400/80 rounded-xl p-5 shadow-xs hover:shadow-md transition-all duration-150 flex flex-col justify-between group"
            >
              <div>
                {/* Card Top Pill & Icon */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl border ${agent.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      {agent.badge}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      ACTIVE
                    </span>
                  </div>
                </div>

                {/* Agent Title & Description */}
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors font-sans">
                  {agent.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-sans min-h-[36px]">
                  {agent.description}
                </p>

                {/* Key Metric Box */}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                      {agent.stats.label}
                    </div>
                    <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                      {agent.stats.metric}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-medium text-slate-600 font-sans">
                      {agent.stats.statusText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleRunAgent(agent)}
                  disabled={isTriggering}
                  className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  {isTriggering ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-200" />
                      <span>Deploying Agent...</span>
                    </>
                  ) : (
                    <>
                      <span>{agent.actionLabel}</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture Note Card */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 flex items-start space-x-3 text-xs text-slate-600 font-sans">
        <div className="p-1 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0 mt-0.5">
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-slate-900">Deterministic Mathematical Bounding: </span>
          All agents in LedgerTrace operate under strict invariant bounds. Agents formulate Bayesian hypotheses 
          and diagnostic evidence, while all accounting numbers and tax calculations are strictly bounded by deterministic 
          decimal arithmetic (Zero Math Hallucinations).
        </div>
      </div>
    </div>
  );
};

export default AgentFleet;
