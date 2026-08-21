import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { LineageGraph } from './components/LineageGraph';
import { DiscrepancyTable } from './components/DiscrepancyTable';
import { AgentDrawer } from './components/AgentDrawer';
import { ActionCenter } from './components/ActionCenter';
import { CommandPalette } from './components/CommandPalette';
import { UploadModal } from './components/UploadModal';
import { runReconciliation } from './services/api';

export const App = () => {
  const [data, setData] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [scanStage, setScanStage] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('default');
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [actionLog, setActionLog] = useState([]);
  const [resolvedDiscrepancyIds, setResolvedDiscrepancyIds] = useState([]);

  const fetchReconciliation = async (presetOverride) => {
    const activePreset = presetOverride || selectedPreset;
    setIsRunning(true);
    setScanStage('Ingesting Merchant DB, Gateway Settlement MIS, and Bank Statement feeds...');

    try {
      // Step 1: Simulate progressive stage logs for realism
      await new Promise(r => setTimeout(r, 200));
      setScanStage('Evaluating MDR rate card contracts & 18% GST invariants...');
      await new Promise(r => setTimeout(r, 200));
      setScanStage('Constructing 3-way financial lineage provenance topology...');
      
      const res = await runReconciliation(activePreset);
      
      await new Promise(r => setTimeout(r, 150));
      setScanStage('Running autonomous forensic agents on detected anomalies...');
      
      setData(res);
      setLastUpdated(res.timestamp || new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to run reconciliation:', err);
    } finally {
      setIsRunning(false);
      setScanStage('');
    }
  };

  useEffect(() => {
    fetchReconciliation('default');
  }, []);

  const handlePresetChange = (newPreset) => {
    setSelectedPreset(newPreset);
    fetchReconciliation(newPreset);
  };

  const handleActionCompleted = (action) => {
    setActionLog((prev) => [action, ...prev]);
    setResolvedDiscrepancyIds((prev) => [...prev, action.discrepancyId]);
    setSelectedDiscrepancy(null);
  };

  const handleSelectNode = (node) => {
    if (data?.reconciliation?.discrepancies) {
      const match = data.reconciliation.discrepancies.find(
        (d) => d.order_id === node.id.replace('node_ord_', '') || d.id === node.id
      );
      if (match) {
        setSelectedDiscrepancy(match);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-textDark flex font-sans">
      {/* Left Sidebar */}
      <Sidebar metrics={data?.reconciliation?.metrics} isRunning={isRunning} />

      {/* Main Content Pane */}
      <div className="flex-1 p-8 overflow-y-auto max-w-6xl">
        <Header
          onRefresh={() => fetchReconciliation(selectedPreset)}
          onUploadClick={() => setIsUploadOpen(true)}
          onOpenCommandPalette={() => setIsCommandOpen(true)}
          isRunning={isRunning}
        />

        {data && (
          <>
            <SummaryCards
              metrics={data.reconciliation?.metrics}
              onRunRecon={() => fetchReconciliation(selectedPreset)}
              isRunning={isRunning}
              selectedPreset={selectedPreset}
              onSelectPreset={handlePresetChange}
              scanStage={scanStage}
              lastUpdated={lastUpdated}
            />
            <LineageGraph lineage={data.lineage} onSelectNode={handleSelectNode} />
            <DiscrepancyTable
              discrepancies={data.reconciliation?.discrepancies}
              onSelectDiscrepancy={(disc) => setSelectedDiscrepancy(disc)}
              resolvedIds={resolvedDiscrepancyIds}
            />
            <ActionCenter actionLog={actionLog} />
          </>
        )}
      </div>

      {/* Slide-over Investigation Drawer */}
      <AgentDrawer
        discrepancy={selectedDiscrepancy}
        onClose={() => setSelectedDiscrepancy(null)}
        onActionCompleted={handleActionCompleted}
      />

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onSelectOrder={(order) => {
          if (order) {
            console.log('Selected from palette:', order);
          }
        }}
        reconciledOrders={data?.reconciliation?.reconciled_orders || []}
      />

      {/* CSV Import Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={(newData) => {
          setData(newData);
          setLastUpdated(new Date().toLocaleTimeString());
        }}
      />
    </div>
  );
};

export default App;
