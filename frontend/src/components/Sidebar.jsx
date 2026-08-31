import React from 'react';
import { Layers, CheckSquare, Activity, FileText, ShieldCheck, Sparkles, Sliders, Database, ArrowUpRight, Bot } from 'lucide-react';

export const Sidebar = ({ activeTab, onSelectTab, metrics, isRunning, pendingApprovalCount = 0 }) => {
  const navSections = [
    {
      title: 'DASHBOARDS',
      items: [
        { id: 'RECON', label: 'Continuous Recon', icon: Layers, badge: null },
        { id: 'FLEET', label: 'Agent Fleet', icon: Bot, badge: '5 ACTIVE' },
        { id: 'APPROVAL', label: 'Approval Hub', icon: CheckSquare, badge: pendingApprovalCount > 0 ? pendingApprovalCount : null },
      ]
    },
    {
      title: 'FINTECH OPS',
      items: [
        { id: 'LINEAGE', label: 'Lineage DAG', icon: Activity, badge: null },
        { id: 'AUDIT', label: 'Audit Ledger', icon: FileText, badge: null },
      ]
    }
  ];

  const reconRate = metrics?.reconciliation_rate ?? 63.6;
  const leakage = metrics?.total_leakage_amount ?? 1250;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 border-r border-slate-800 min-h-screen flex flex-col justify-between shrink-0 font-sans select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
              LT
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white font-sans">
                LedgerTrace
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                Autonomous Controller
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="p-4 space-y-5">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider px-2.5 mb-1.5 font-mono">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium text-xs tracking-tight transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== null && (
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                          item.badge === '5 ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1'
                            : 'bg-amber-400 text-slate-950'
                        }`}>
                          {item.badge === '5 ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Autonomous Risk Radar Widget */}
          <div className="pt-2">
            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider px-2.5 mb-2 font-mono flex items-center justify-between">
              <span>Agent Risk Radar</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="bg-slate-850 rounded-xl border border-slate-800 p-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Invariant Math</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  100% Bound
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Bayesian Conf.</span>
                <span className="font-semibold text-white">96.4%</span>
              </div>

              <div className="space-y-1 pt-0.5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Match Rate</span>
                  <span className="text-white font-semibold">{reconRate}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${reconRate}%` }}
                  />
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-800 flex justify-between text-[10px]">
                <span className="text-slate-400">Fee Variance Delta</span>
                <span className="font-semibold text-rose-400">INR {Number(leakage).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Contracted Rates Card */}
          <div className="pt-1">
            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider px-2.5 mb-1.5 font-mono">
              Contracted Rates
            </div>
            <div className="bg-slate-850 rounded-xl border border-slate-800 p-2.5 space-y-1 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-800/80 pb-0.5 text-[11px]">
                <span className="text-slate-400">UPI</span>
                <span className="font-semibold text-white">0.00%</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-0.5 text-[11px]">
                <span className="text-slate-400">Credit / Debit</span>
                <span className="font-semibold text-white">1.80%</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-0.5 text-[11px]">
                <span className="text-slate-400">Net Banking</span>
                <span className="font-semibold text-white">1.50%</span>
              </div>
              <div className="flex justify-between pt-0.5 text-[11px]">
                <span className="text-slate-400">GST</span>
                <span className="font-semibold text-white">18.00%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Attribution */}
      <div className="p-4 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex justify-between items-center">
        <span>DEV: sm-daniyal</span>
        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">FINTECH</span>
      </div>
    </aside>
  );
};

export default Sidebar;
