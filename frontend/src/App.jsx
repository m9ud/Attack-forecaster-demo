import { useEffect, useState } from 'react';
import { useStore } from './store';
import GraphView from './components/GraphView';
import AnalysisPanel from './components/AnalysisPanel';
import ResultsPanel from './components/ResultsPanel';
import ScenarioPanel from './components/ScenarioPanel';
import ExplanationModal from './components/ExplanationModal';
import StatsCharts from './components/StatsCharts';
import FilterPanel from './components/FilterPanel';
import PathAnimationPlayer from './components/PathAnimationPlayer';
import DatasetUpload from './components/DatasetUpload';
import LetterGlitch from './components/LetterGlitch';
import CriticalNodesPanel from './components/CriticalNodesPanel';
import MitigationsPanel from './components/MitigationsPanel';
import NodeContextMenu from './components/NodeContextMenu';
import ReportPanel from './components/ReportPanel';
import {
  ZapIcon, PathIcon, GlobeIcon, BarChartIcon, PanelRightIcon,
  SettingsIcon, CrosshairIcon,
  AlertTriangleIcon, SearchIcon, LoaderIcon,
  ChevronDownIcon, ChevronUpIcon, NetworkIcon,
  TargetIcon, ShieldIcon, FileTextIcon,
} from './components/Icons';

const TABS = [
  { id: 'config',    label: 'Config',    icon: <SettingsIcon size={13} />,     title: 'Configuration' },
  { id: 'results',   label: 'Results',   icon: <BarChartIcon size={13} />,     title: 'Analysis Results' },
  { id: 'scenarios', label: 'Scenarios', icon: <ZapIcon size={13} />,          title: 'Scenarios' },
  { id: 'critical',  label: 'Nodes',     icon: <TargetIcon size={13} />,       title: 'Critical Nodes' },
  { id: 'mitigate',  label: 'Mitigate',  icon: <ShieldIcon size={13} />,       title: 'Mitigations' },
  { id: 'report',    label: 'Report',    icon: <FileTextIcon size={13} />,     title: 'Auto Report Generator' },
];

export default function App() {
  const loading               = useStore((s) => s.loading);
  const error                 = useStore((s) => s.error);
  const analysis              = useStore((s) => s.analysis);
  const nodes                 = useStore((s) => s.nodes);
  const edges                 = useStore((s) => s.edges);
  const clusterView           = useStore((s) => s.clusterView);
  const toggleClusterView     = useStore((s) => s.toggleClusterView);
  const focusNode             = useStore((s) => s.focusNode);
  const selectedPathId        = useStore((s) => s.selectedPathId);
  const animatingPathId       = useStore((s) => s.animatingPathId);
  const isolateSelectedPath   = useStore((s) => s.isolateSelectedPath);
  const toggleIsolateSelectedPath = useStore((s) => s.toggleIsolateSelectedPath);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chartsOpen,  setChartsOpen]  = useState(false);
  const [activeTab,   setActiveTab]   = useState('config');

  /* auto-switch tabs when analysis finishes */
  useEffect(() => {
    if (analysis) {
      setActiveTab('results');
      setChartsOpen(true);
    }
  }, [analysis]);

  /* ── Landing screen ─────────────────────────────────────────────── */
  const datasetLoaded = nodes.length > 0;

  if (!datasetLoaded) {
    return (
      <div className="app">
        <div className="landing-fullscreen">
          <LetterGlitch
            glitchColors={['#0d2a1a', '#1a4d2e', '#61dca3', '#2d6a9f', '#1e3a5f']}
            glitchSpeed={55}
            outerVignette
            centerVignette
          />
          <div className="landing-overlay">
            <div className="landing-glass-card">
              <div className="landing-brand">
                <PathIcon size={20} className="landing-brand-icon" />
                <span className="landing-brand-name">Attack Path Forecaster</span>
              </div>
              <h2 className="landing-heading">Load a Dataset to Begin</h2>
              <p className="landing-subtext">
                Upload an Active Directory graph dataset to map attack paths,
                rank them by risk, and simulate defensive changes.
              </p>
              <DatasetUpload />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-left">
          <PathIcon size={18} className="topbar-logo-icon" />
          <h1 className="topbar-title">Attack Path Forecaster</h1>
          <span className="topbar-badge">
            AD Graph · {nodes.length} Nodes · {edges.length} Edges
          </span>
        </div>
        <div className="topbar-right">
          {loading && (
            <span className="topbar-status loading-pulse">
              <LoaderIcon size={13} className="spin-icon" /> Analyzing…
            </span>
          )}
          {error && (
            <span className="topbar-status topbar-error">
              <AlertTriangleIcon size={13} /> {error}
            </span>
          )}
          {focusNode && (
            <span className="topbar-status topbar-focus">
              <SearchIcon size={13} /> Focus: {focusNode}
            </span>
          )}
          <button
            className={`topbar-btn ${clusterView ? 'active' : ''}`}
            onClick={toggleClusterView}
            title="Toggle cluster/subnet view"
          >
            <GlobeIcon size={14} /> Cluster
          </button>
          <button
            className={`topbar-btn ${chartsOpen ? 'active' : ''}`}
            onClick={() => setChartsOpen(!chartsOpen)}
            title="Toggle charts"
          >
            <BarChartIcon size={14} /> Charts
          </button>
          <button
            className={`topbar-btn ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle sidebar"
          >
            <PanelRightIcon size={14} /> Panel
          </button>
        </div>
      </header>

      {/* ── Main Area ───────────────────────────────────────────────── */}
      <div className="workspace">
        <div className="graph-area">
          <GraphView />

          {selectedPathId && (
            <button
              className={`isolate-pill ${isolateSelectedPath ? 'isolate-pill--active' : ''}`}
              onClick={toggleIsolateSelectedPath}
              title={isolateSelectedPath ? 'Show all nodes' : 'Show selected path only'}
            >
              {isolateSelectedPath ? (
                <><CrosshairIcon size={13} /> Isolated: {selectedPathId} — Click to show all</>
              ) : (
                <><CrosshairIcon size={13} /> Isolate path {selectedPathId}</>
              )}
            </button>
          )}

          {(selectedPathId || animatingPathId) && (
            <div className="animation-overlay">
              <PathAnimationPlayer />
            </div>
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
          {sidebarOpen && (
            <>
              {/* Tab bar — scrollable */}
              <div className="sidebar-tabs sidebar-tabs--scroll">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.title}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.id === 'report' && (
                      <span className="tab-new-dot" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="sidebar-content">
                {activeTab === 'config'    && <><DatasetUpload /><AnalysisPanel /></>}
                {activeTab === 'results'   && <ResultsPanel />}
                {activeTab === 'scenarios' && <ScenarioPanel />}
                {activeTab === 'filters'   && <FilterPanel />}
                {activeTab === 'critical'  && <CriticalNodesPanel />}
                {activeTab === 'mitigate'  && <MitigationsPanel />}
                {activeTab === 'report'    && <ReportPanel />}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ── Bottom Charts Drawer ────────────────────────────────────── */}
      <div className={`charts-drawer ${chartsOpen ? 'charts-drawer--open' : 'charts-drawer--closed'}`}>
        <button className="charts-drawer-toggle" onClick={() => setChartsOpen(!chartsOpen)}>
          {chartsOpen ? <ChevronDownIcon size={14} /> : <ChevronUpIcon size={14} />}
          <NetworkIcon size={14} />
          Network Analytics
        </button>
        {chartsOpen && <StatsCharts />}
      </div>

      <ExplanationModal />
      <NodeContextMenu />
    </div>
  );
}
