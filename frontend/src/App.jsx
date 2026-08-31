import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { CloseCockpit } from './components/CloseCockpit';
import { NLSearchBar } from './components/NLSearchBar';
import { LineageGraph } from './components/LineageGraph';
import { DiscrepancyTable } from './components/DiscrepancyTable';
import { AgentFleet } from './components/AgentFleet';
import { ApprovalHub } from './components/ApprovalHub';
import { AgentDrawer } from './components/AgentDrawer';
import { ActionCenter } from './components/ActionCenter';
import { CommandPalette } from './components/CommandPalette';
import { UploadModal } from './components/UploadModal';
import { runReconciliation, getCloseStatus, getApprovalQueue } from './services/api';
import { getPresetFallbackData, getEmptyInitialData } from './services/mockData';

export const App = () => {
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [data, setData] = useState(() => getEmptyInitialData());
  const [closeStatus, setCloseStatus] = useState(null);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [scanStage, setScanStage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(() => new Date().toLocaleTimeString());
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState(null);
  const [activeTab, setActiveTab] = useState('RECON'); // RECON | APPROVAL | LINEAGE | AUDIT
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [actionLog, setActionLog] = useState([]);
  const [resolvedDiscrepancyIds, setResolvedDiscrepancyIds] = useState([]);

  const fetchReconciliation = async (presetOverride) => {
    const activePreset = presetOverride || selectedPreset || 'default';
    setSelectedPreset(activePreset);
    setIsRunning(true);
    setScanStage('Ingesting Merchant DB, Gateway Settlement MIS, and Bank Statement feeds...');

    try {
      await new Promise((r) => setTimeout(r, 200));
      setScanStage('Evaluating MDR rate card contracts & 18% GST invariants...');
      await new Promise((r) => setTimeout(r, 200));
      setScanStage('Constructing 3-way financial lineage provenance DAG...');

      const res = await runReconciliation(activePreset);

      await new Promise((r) => setTimeout(r, 150));
      setScanStage('Running autonomous forensic agents & anomaly radar...');

      setData(res);
      setLastUpdated(res.timestamp || new Date().toLocaleTimeString());

      try {
        const cStatus = await getCloseStatus();
        setCloseStatus(cStatus);
        const aQueue = await getApprovalQueue('PENDING_APPROVAL');
        setPendingApprovalCount(aQueue?.stats?.pending_approval || aQueue?.queue?.length || 0);
      } catch (e) {
        // Fallback
      }
    } catch (err) {
      console.warn('Backend API connection pending, loaded preset data locally:', err.message);
      const fallback = getPresetFallbackData(activePreset);
      setData(fallback);
      setLastUpdated(new Date().toLocaleTimeString());
      setPendingApprovalCount(fallback.reconciliation?.discrepancies?.length || 2);
    } finally {
      setIsRunning(false);
      setScanStage('');
    }
  };

  useEffect(() => {
    // Keyboard shortcut Ctrl+K / Cmd+K listener
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handlePresetChange = (newPreset) => {
    setSelectedPreset(newPreset);
    setResolvedDiscrepancyIds([]);
    fetchReconciliation(newPreset);
  };

  const handleResetStandby = () => {
    setSelectedPreset(null);
    setData(getEmptyInitialData());
    setPendingApprovalCount(0);
    setResolvedDiscrepancyIds([]);
    setActionLog([]);
    setCloseStatus(null);
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

  const handleNLResultSelect = (item) => {
    if (item && (item.id || item.order_id)) {
      const match = data?.reconciliation?.discrepancies?.find(
        (d) => d.id === item.id || d.order_id === item.order_id
      );
      if (match) {
        setSelectedDiscrepancy(match);
      } else {
        setSelectedDiscrepancy(item);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex font-sans antialiased">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        metrics={data?.reconciliation?.metrics}
        isRunning={isRunning}
        pendingApprovalCount={pendingApprovalCount}
      />

      {/* Main Content Pane */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl">
        <Header
          onRefresh={() => fetchReconciliation(selectedPreset || 'default')}
          onUploadClick={() => setIsUploadOpen(true)}
          onOpenCommandPalette={() => setIsCommandOpen(true)}
          isRunning={isRunning}
        />

        {/* Tab 1: Overview & Reconciliation */}
        {activeTab === 'RECON' && (
          <div className="space-y-6">
            {/* Top Metric Cards + Scenario Presets */}
            <SummaryCards
              metrics={data?.reconciliation?.metrics}
              onRunRecon={() => fetchReconciliation(selectedPreset || 'default')}
              isRunning={isRunning}
              selectedPreset={selectedPreset}
              onSelectPreset={handlePresetChange}
              onResetStandby={handleResetStandby}
              scanStage={scanStage}
              lastUpdated={lastUpdated}
            />

            {/* Continuous Close Status Bar */}
            <CloseCockpit
              closeStatus={closeStatus}
              metrics={data?.reconciliation?.metrics}
            />

            {/* Natural Language Financial Query Bar */}
            <NLSearchBar
              reconData={data}
              onSelectResult={handleNLResultSelect}
            />

            {/* Discrepancy Queue & Anomaly Radar */}
            <DiscrepancyTable
              discrepancies={data?.reconciliation?.discrepancies || []}
              anomalyAlerts={data?.reconciliation?.anomaly_alerts || []}
              onSelectDiscrepancy={(disc) => setSelectedDiscrepancy(disc)}
              resolvedIds={resolvedDiscrepancyIds}
            />

            {/* Lineage Graph */}
            <LineageGraph lineage={data?.lineage} onSelectNode={handleSelectNode} />
          </div>
        )}

        {/* Tab 2: Autonomous Agent Fleet */}
        {activeTab === 'FLEET' && (
          <AgentFleet
            reconData={data}
            onSelectDiscrepancy={(disc) => setSelectedDiscrepancy(disc)}
            onNavigateToApproval={() => setActiveTab('APPROVAL')}
          />
        )}

        {/* Tab 3: Human-in-the-Loop Approval Hub */}
        {activeTab === 'APPROVAL' && (
          <ApprovalHub
            reconData={data}
            onActionExecuted={(res) => {
              setActionLog((prev) => [
                {
                  type: 'APPROVAL_EXECUTED',
                  discrepancyId: res.action_id,
                  data: res
                },
                ...prev
              ]);
            }}
          />
        )}

        {/* Tab 3: Financial Lineage DAG */}
        {activeTab === 'LINEAGE' && (
          <div className="space-y-6">
            <LineageGraph lineage={data?.lineage} onSelectNode={handleSelectNode} />
          </div>
        )}

        {/* Tab 4: Executed Audit Trail & Action Center */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-6">
            <ActionCenter actionLog={actionLog} />
          </div>
        )}
      </main>

      {/* Slide-over Forensic Investigation Drawer */}
      <AgentDrawer
        discrepancy={selectedDiscrepancy}
        onClose={() => setSelectedDiscrepancy(null)}
        onActionCompleted={handleActionCompleted}
      />

      {/* Command Palette Modal (Ctrl+K) */}
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
