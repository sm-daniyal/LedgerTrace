import React from 'react';
import { Database, ShieldCheck, Cpu, Terminal, FileText, CheckCircle2 } from 'lucide-react';

export const Sidebar = ({ metrics, isRunning }) => {
  return (
    <aside className="w-64 bg-sidebarBg border-r border-borderCol min-h-screen p-5 flex flex-col justify-between shrink-0 font-sans">
      <div className="space-y-6">
        {/* Brand */}
        <div>
          <div className="text-xs font-mono font-bold tracking-wider text-textDark uppercase">
            LEDGERTRACE SYSTEM
          </div>
          <div className="text-[11px] text-textMuted font-mono mt-0.5">
            v2026.1 Enterprise Core
          </div>
        </div>

        <div className="border-t border-borderCol"></div>

        {/* Engine Connection Status */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono text-textMuted uppercase tracking-wider">
            ENGINE CONNECTION
          </div>
          <div className="w-full py-2 px-3 rounded bg-lightGreenPill border border-green-200 text-lightGreenText font-mono font-semibold text-xs flex items-center justify-between">
            <span>ENGINE LOADED</span>
            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
          </div>
          <div className="text-[11px] text-textMuted font-mono space-y-0.5">
            <div>Graph size: {metrics ? (metrics.total_merchant_orders * 3) : 0} nodes</div>
            <div>SLA window: 48 hours</div>
            <div>Active Contract: TechStore 2026</div>
          </div>
        </div>

        <div className="border-t border-borderCol"></div>

        {/* System Details Callout */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono text-textMuted uppercase tracking-wider">
            SYSTEM DETAILS
          </div>
          <div className="p-3.5 bg-lightBlueBox border border-blue-200 rounded-lg text-lightBlueText text-[11px] leading-relaxed">
            Uses a deterministic 3-way financial reconciliation engine and autonomous multi-agent DAG to identify MDR fee leakage, dropped webhooks, and ledger discrepancies.
          </div>
        </div>

        {/* Contract Rate Card Summary */}
        <div className="space-y-1.5 font-mono text-[10px] text-textMuted">
          <div className="font-semibold text-textDark uppercase">CONTRACTED RATE CARD</div>
          <div className="flex justify-between border-b border-borderCol/60 py-0.5">
            <span>UPI</span>
            <span className="font-semibold text-textDark">0.00%</span>
          </div>
          <div className="flex justify-between border-b border-borderCol/60 py-0.5">
            <span>Debit Cards</span>
            <span className="font-semibold text-textDark">0.90%</span>
          </div>
          <div className="flex justify-between border-b border-borderCol/60 py-0.5">
            <span>Credit Cards</span>
            <span className="font-semibold text-textDark">1.80%</span>
          </div>
          <div className="flex justify-between border-b border-borderCol/60 py-0.5">
            <span>Net Banking</span>
            <span className="font-semibold text-textDark">1.50%</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span>Standard GST</span>
            <span className="font-semibold text-textDark">18.00%</span>
          </div>
        </div>
      </div>

      {/* Footer Attribution */}
      <div className="pt-6 border-t border-borderCol text-[11px] text-textMuted font-mono">
        Developed by sm-daniyal
      </div>
    </aside>
  );
};
