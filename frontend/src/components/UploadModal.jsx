import React, { useState } from 'react';
import { X, UploadCloud } from 'lucide-react';
import { uploadCustomFeeds } from '../services/api';

export const UploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
  const [ordersFile, setOrdersFile] = useState(null);
  const [gatewayFile, setGatewayFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ordersFile || !gatewayFile || !bankFile) {
      alert('Please select all three CSV feed files.');
      return;
    }

    setIsUploading(true);
    try {
      const data = await uploadCustomFeeds(ordersFile, gatewayFile, bankFile);
      onUploadSuccess(data);
      onClose();
    } catch (err) {
      alert('Upload and reconciliation failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-surfaceBorder rounded-lg w-full max-w-lg shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-surfaceBorder mb-4">
          <div>
            <h3 className="text-sm font-semibold text-textPrimary">Import Custom Financial Feeds</h3>
            <p className="text-xs text-textSecondary">Upload CSV feeds for 3-way automated reconciliation</p>
          </div>
          <button onClick={onClose} className="text-textSecondary hover:text-textPrimary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-textPrimary mb-1">1. Merchant Orders Feed (CSV)</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setOrdersFile(e.target.files[0])}
              className="w-full bg-background border border-surfaceBorder rounded p-2 text-textSecondary file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-surface file:text-textPrimary"
            />
          </div>

          <div>
            <label className="block font-medium text-textPrimary mb-1">2. Gateway Settlement MIS (CSV)</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setGatewayFile(e.target.files[0])}
              className="w-full bg-background border border-surfaceBorder rounded p-2 text-textSecondary file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-surface file:text-textPrimary"
            />
          </div>

          <div>
            <label className="block font-medium text-textPrimary mb-1">3. Bank Statement Feed (CSV)</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setBankFile(e.target.files[0])}
              className="w-full bg-background border border-surfaceBorder rounded p-2 text-textSecondary file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-surface file:text-textPrimary"
            />
          </div>

          <div className="pt-4 border-t border-surfaceBorder flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded text-textSecondary hover:text-textPrimary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-1.5 rounded bg-accent hover:bg-accentHover text-white font-medium disabled:opacity-50 flex items-center space-x-1.5"
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
