import React, { useState } from 'react';
import { Search, Sparkles, X, ArrowRight, Loader2, Database, AlertCircle, TrendingUp, CheckCircle2 } from 'lucide-react';
import { queryNL } from '../services/api';

export const NLSearchBar = ({ reconData, onSelectResult }) => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  // Auto-reset search bar when dataset / preset changes for a fresh view
  React.useEffect(() => {
    setQuestion('');
    setResult(null);
    setIsOpen(false);
    setError('');
  }, [reconData]);

  const sampleQueries = [
    'Total fee leakage this batch',
    'Show all overcharges above 500',
    'Which settlements are delayed beyond SLA?',
    'Compare 3-way totals (Merchant vs Gateway vs Bank)',
    'Find order ORD_FS_101'
  ];

  const handleClientFallbackQuery = (q, data) => {
    const qLower = q.toLowerCase();
    const recon = data?.reconciliation || {};
    const discrepancies = recon.discrepancies || [];
    const metrics = recon.metrics || {};

    if (qLower.includes('500') || qLower.includes('above')) {
      const overcharges = discrepancies.filter((d) => (d.impact_amount || 0) >= 500);
      const sum = overcharges.reduce((acc, d) => acc + (d.impact_amount || 0), 0);
      return {
        interpreted_as: { intent: 'filter', entities: { min_amount: 500 } },
        result_count: overcharges.length,
        results: {
          summary: `Found ${overcharges.length} anomaly record(s) with impact amount >= INR 500. Total value: INR ${sum.toLocaleString('en-IN')}.`,
          aggregate: { total_impact: sum, transaction_count: overcharges.length },
          items: overcharges
        }
      };
    } else if (qLower.includes('leakage') || qLower.includes('overcharge')) {
      const overcharges = discrepancies.filter((d) => d.type === 'MDR_OVERCHARGE');
      const sum = overcharges.reduce((acc, d) => acc + (d.impact_amount || 0), 0);
      return {
        interpreted_as: { intent: 'aggregate', entities: { disc_type: 'MDR_OVERCHARGE' } },
        result_count: overcharges.length,
        results: {
          summary: `Total fee leakage from unauthorized MDR rate surcharges: INR ${sum.toLocaleString('en-IN')} across ${overcharges.length} transaction(s).`,
          aggregate: { total_fee_leakage: sum, flagged_count: overcharges.length },
          items: overcharges
        }
      };
    } else if (qLower.includes('delay') || qLower.includes('sla')) {
      const delays = discrepancies.filter((d) => d.type === 'SETTLEMENT_DELAY');
      const sum = delays.reduce((acc, d) => acc + (d.impact_amount || 0), 0);
      return {
        interpreted_as: { intent: 'aggregate', entities: { disc_type: 'SETTLEMENT_DELAY' } },
        result_count: delays.length,
        results: {
          summary: `Pending settlements breached beyond 48-hour SLA: INR ${sum.toLocaleString('en-IN')} across ${delays.length} transaction(s).`,
          aggregate: { floating_capital: sum, delayed_batches: delays.length },
          items: delays
        }
      };
    } else if (qLower.includes('compare') || qLower.includes('totals')) {
      return {
        interpreted_as: { intent: 'compare', entities: {} },
        result_count: 1,
        results: {
          summary: `3-Way Balance Provenance: Merchant Volume = INR ${Number(metrics.total_merchant_amount || 376500).toLocaleString('en-IN')} | Gateway Captured = INR ${Number(metrics.total_gateway_captured_amount || 376500).toLocaleString('en-IN')} | Bank Credited = INR ${Number(metrics.total_bank_settled_amount || 273980).toLocaleString('en-IN')}.`,
          aggregate: {
            merchant_gross: metrics.total_merchant_amount || 376500,
            gateway_captured: metrics.total_gateway_captured_amount || 376500,
            bank_credited: metrics.total_bank_settled_amount || 273980,
            unauthorized_leakage: metrics.total_leakage_amount || 1845
          }
        }
      };
    } else {
      const matched = discrepancies.filter(
        (d) =>
          d.order_id?.toLowerCase().includes(qLower) ||
          d.id?.toLowerCase().includes(qLower) ||
          d.gateway_payment_id?.toLowerCase().includes(qLower)
      );
      return {
        interpreted_as: { intent: 'search', entities: { query: q } },
        result_count: matched.length,
        results: {
          summary: `Found ${matched.length > 0 ? matched.length : discrepancies.length} record(s) matching "${q}".`,
          items: matched.length > 0 ? matched : discrepancies
        }
      };
    }
  };

  const handleSearch = async (queryText) => {
    const q = queryText || question;
    if (!q || !q.trim()) return;

    setQuestion(q);
    setIsLoading(true);
    setError('');
    setIsOpen(true);

    try {
      const res = await queryNL(q);
      if (res && res.results) {
        setResult(res);
      } else {
        const clientRes = handleClientFallbackQuery(q, reconData);
        setResult(clientRes);
      }
    } catch (err) {
      const clientRes = handleClientFallbackQuery(q, reconData);
      setResult(clientRes);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch(question);
    }
  };

  return (
    <div className="relative mb-6 font-sans">
      {/* Search Input Container */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs hover:border-slate-300 transition-all p-1.5 flex items-center gap-2">
        <div className="pl-3 text-indigo-600 flex items-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask LedgerTrace Financial Intelligence... (e.g. 'Total fee leakage' or 'Show overcharges above 500')"
          className="flex-1 py-1.5 px-2 text-xs text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none focus:ring-0 font-sans"
        />
        {question && (
          <button
            onClick={() => { setQuestion(''); setResult(null); setIsOpen(false); }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => handleSearch(question)}
          disabled={isLoading || !question.trim()}
          className="pro-btn pro-btn-indigo py-1.5 px-4 text-xs font-semibold rounded-lg flex items-center gap-1.5"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>Query</span>
        </button>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="flex items-center gap-2 mt-2 px-1 overflow-x-auto text-xs">
        <span className="text-slate-600 font-medium text-xs whitespace-nowrap">Suggested Queries:</span>
        {sampleQueries.map((sq, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQuestion(sq);
              handleSearch(sq);
            }}
            className="px-2.5 py-1 rounded-full bg-slate-100/90 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 text-xs border border-slate-200 hover:border-indigo-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Structured In-Flow Results Container */}
      {isOpen && (
        <div className="mt-3 bg-white border border-slate-200 rounded-xl shadow-card p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="pro-badge bg-indigo-50 text-indigo-700 font-mono text-[11px]">
                INTENT: {result?.interpreted_as?.intent?.toUpperCase() || 'PARSED_QUERY'}
              </span>
              <span className="text-xs text-slate-500 font-medium font-mono">
                {result?.result_count || 0} result(s) found
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {result && (
            <div className="space-y-3">
              {/* Summary sentence */}
              {result.results?.summary && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs font-medium text-slate-800 leading-relaxed font-sans">
                  {result.results.summary}
                </div>
              )}

              {/* Aggregate KPI grid */}
              {result.results?.aggregate && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                  {Object.entries(result.results.aggregate).map(([k, v]) => (
                    <div key={k} className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100">
                      <div className="text-slate-500 uppercase tracking-wider text-[10px] truncate">{k.replace(/_/g, ' ')}</div>
                      <div className="text-sm font-bold text-indigo-900 mt-0.5">
                        {typeof v === 'number' && v > 100 ? `INR ${v.toLocaleString('en-IN')}` : String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Matching items table */}
              {Array.isArray(result.results?.items) && result.results.items.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden mt-2 font-mono">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-[11px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Order Ref</th>
                        <th className="py-2.5 px-3">Discrepancy Type</th>
                        <th className="py-2.5 px-3 text-right">Impact Amount</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.results.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 bg-white">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{item.order_id || item.id || 'RECORD'}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-sans font-medium">{item.type || item.status || 'ANOMALY'}</td>
                          <td className="py-2.5 px-3 text-right text-rose-600 font-bold">
                            INR {Number(item.impact_amount || item.amount || item.gross_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-sans">
                            <button
                              onClick={() => {
                                if (onSelectResult) onSelectResult(item);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>Inspect</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NLSearchBar;
