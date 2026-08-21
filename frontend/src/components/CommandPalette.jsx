import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export const CommandPalette = ({ isOpen, onClose, onSelectOrder, reconciledOrders = [] }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onSelectOrder(null);
      }
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
      o.order_id.toLowerCase().includes(query.toLowerCase()) ||
      (o.gateway_payment_id && o.gateway_payment_id.toLowerCase().includes(query.toLowerCase())) ||
      (o.bank_ref_no && o.bank_ref_no.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4">
      <div className="bg-surface border border-surfaceBorder rounded-lg w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="p-3 border-b border-surfaceBorder flex items-center space-x-2">
          <Search className="w-4 h-4 text-textSecondary" />
          <input
            type="text"
            placeholder="Search by Order ID, Payment ID, or Bank UTR..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="bg-transparent text-textPrimary placeholder:text-textSecondary text-xs focus:outline-none w-full font-mono"
          />
          <button onClick={onClose} className="text-textSecondary hover:text-textPrimary p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 divide-y divide-surfaceBorder/40">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-textSecondary font-mono">No matching records found.</div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.order_id}
                onClick={() => {
                  onSelectOrder(item);
                  onClose();
                }}
                className="p-2.5 rounded hover:bg-background/80 cursor-pointer flex items-center justify-between text-xs transition-colors"
              >
                <div>
                  <div className="font-mono font-medium text-textPrimary">{item.order_id}</div>
                  <div className="text-[10px] text-textSecondary font-mono mt-0.5">
                    Gateway: {item.gateway_payment_id} | UTR: {item.bank_ref_no}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold text-success">INR {item.amount.toLocaleString()}</div>
                  <div className="text-[10px] text-textSecondary">Reconciled</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
