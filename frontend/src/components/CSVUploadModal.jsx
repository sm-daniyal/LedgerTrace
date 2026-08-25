import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, X } from 'lucide-react';
import { uploadCSVData } from '../services/api';

export const CSVUploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
  const [ordersFile, setOrdersFile] = useState(null);
  const [gatewayFile, setGatewayFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!ordersFile || !gatewayFile || !bankFile) {
      setError('Please attach all 3 feed files (Merchant Orders, Gateway MIS, and Bank Statement).');
      return;
    }

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('orders_file', ordersFile);
    formData.append('gateway_file', gatewayFile);
    formData.append('bank_file', bankFile);

    try {
      const data = await uploadCSVData(formData);
      onUploadSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Upload and reconciliation failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Import Financial Feeds</h3>
            <p className="text-xs text-slate-500 mt-0.5">Upload 3-way transactional CSVs for instant reconciliation</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-3.5">
          {/* Feed 1 */}
          <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>1. Merchant Orders Feed (Internal OMS/DB)</span>
              {ordersFile && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setOrdersFile(e.target.files[0])}
              className="text-xs text-slate-600 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer w-full"
            />
          </div>

          {/* Feed 2 */}
          <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>2. Gateway Settlements MIS (Aggregator Feed)</span>
              {gatewayFile && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setGatewayFile(e.target.files[0])}
              className="text-xs text-slate-600 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer w-full"
            />
          </div>

          {/* Feed 3 */}
          <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>3. Bank Statement Feed (UTR Credits)</span>
              {bankFile && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setBankFile(e.target.files[0])}
              className="text-xs text-slate-600 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="pro-btn pro-btn-secondary py-2 px-4 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="pro-btn pro-btn-indigo py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Reconciling Feeds...' : 'Upload & Reconcile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CSVUploadModal;
