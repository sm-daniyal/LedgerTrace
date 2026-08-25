import React, { useState, useEffect } from 'react';
import { Search, X, ArrowRight, CheckCircle2 } from 'lucide-react';

export const CommandPalette = ({ isOpen, onClose, onSelectOrder, reconciledOrders = [] }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = reconciledOrders.filter(
    (o) =>
      o.order_id?.toLowerCase().includes(query.toLowerCase()) ||
      (o.gateway_payment_id && o.gateway_payment_id.toLowerCase().includes(query.toLowerCase())) ||
      (o.bank_ref_no && o.bank_ref_no.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-start justify-center pt-20 px-4 font-sans">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden font-mono">
        {/* Search Header */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center space-x-2.5">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Order ID, Payment ID, or Bank UTR..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="bg-transparent text-slate-900 placeholder:text-slate-400 text-xs font-medium focus:outline-none w-full"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 font-sans">
              No matching financial records found.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.order_id}
                onClick={() => {
                  if (onSelectOrder) onSelectOrder(item);
                  onClose();
                }}
                className="p-3 hover:bg-slate-50/80 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors"
              >
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <span>{item.order_id}</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      MATCHED
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Gateway: {item.gateway_payment_id || 'N/A'} | UTR: {item.bank_ref_no || 'N/A'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">INR {Number(item.amount || 0).toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-emerald-600 font-medium">3-Way Balanced</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Hint */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-sans font-medium">
          <span>Click item to inspect details</span>
          <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-mono">
            ESC to close
          </kbd>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
