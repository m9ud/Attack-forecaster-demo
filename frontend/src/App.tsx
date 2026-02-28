import { useEffect, useState } from 'react';
import { useStore } from './store';
import GraphView from './components/GraphView';
import AnalysisPanel from './components/AnalysisPanel';
import ResultsPanel from './components/ResultsPanel';
import ScenarioPanel from './components/ScenarioPanel';
import ExplanationModal from './components/ExplanationModal';
import StatsCharts from './components/StatsCharts';
import FilterPanel from './components/FilterPanel';
import FocusMode from './components/FocusMode';
import PathAnimationPlayer from './components/PathAnimationPlayer';
import DatasetUpload from './components/DatasetUpload';

export default function App() {
  const loading = useStore((s: any) => s.loading);
  const error = useStore((s: any) => s.error);
  const analysis = useStore((s: any) => s.analysis);
  const nodes = useStore((s: any) => s.nodes);
  const edges = useStore((s: any) => s.edges);
  const clusterView = useStore((s: any) => s.clusterView);
  const toggleClusterView = useStore((s: any) => s.toggleClusterView);
  const focusNode = useStore((s: any) => s.focusNode);
  const selectedPathId = useStore((s: any) => s.selectedPathId);
  const animatingPathId = useStore((s: any) => s.animatingPathId);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chartsOpen, setChartsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'results' | 'scenarios' | 'filters' | 'focus'>('config');

  /* auto-switch tabs when analysis finishes */
  useEffect(() => {
    if (analysis) {
      setActiveTab('results');
      setChartsOpen(true);
    }
  }, [analysis]);

  /* ── Landing screen: no dataset loaded yet ──────────────────────── */
  const datasetLoaded = nodes.length > 0;

  if (!datasetLoaded) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-logo">&#9889;</span>
            <h1 className="topbar-title">Attack Path Forecaster</h1>
          </div>
        </header>
        <div className="landing">
          <div className="landing-card">
            <div className="landing-icon">&#128194;</div>
            <h2 className="landing-heading">Upload a Dataset to Begin</h2>
            <p className="landing-subtext">
              Drop a JSON file below to load your network graph.
              The system will parse nodes, edges, and scenarios automatically.
            </p>
            <DatasetUpload />
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
          <span className="topbar-logo">&#9889;</span>
          <h1 className="topbar-title">Attack Path Forecaster</h1>
          <span className="topbar-badge">
            AD Graph · {nodes.length} Nodes · {edges.length} Edges
          </span>
        </div>
        <div className="topbar-right">
          {loading && <span className="topbar-status loading-pulse">&#9679; Analyzing…</span>}
          {error && <span className="topbar-status topbar-error">&#9888; {error}</span>}
          {focusNode && <span className="topbar-status topbar-focus">&#128269; Focus: {focusNode}</span>}
          <button
            className={`topbar-btn ${clusterView ? 'active' : ''}`}
            onClick={toggleClusterView}
            title="Toggle cluster/subnet view"
          >
            &#127760; Cluster
          </button>
          <button
            className={`topbar-btn ${chartsOpen ? 'active' : ''}`}
            onClick={() => setChartsOpen(!chartsOpen)}
            title="Toggle charts"
          >
            &#128202; Charts
          </button>
          <button
            className={`topbar-btn ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle sidebar"
          >
            &#9776; Panel
          </button>
        </div>
      </header>

      {/* ── Main Area ───────────────────────────────────────────────── */}
      <div className="workspace">
        {/* Graph fills available space */}
        <div className="graph-area">
          <GraphView />

          {/* Path Animation Player overlay */}
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
              {/* Tab bar */}
              <div className="sidebar-tabs">
                <button
                  className={`sidebar-tab ${activeTab === 'config' ? 'active' : ''}`}
                  onClick={() => setActiveTab('config')}
                >
                  &#9881; Config
                </button>
                <button
                  className={`sidebar-tab ${activeTab === 'results' ? 'active' : ''}`}
                  onClick={() => setActiveTab('results')}
                >
                  &#128202; Results
                </button>
                <button
                  className={`sidebar-tab ${activeTab === 'scenarios' ? 'active' : ''}`}
                  onClick={() => setActiveTab('scenarios')}
                >
                  &#9889; Scenarios
                </button>
                <button
                  className={`sidebar-tab ${activeTab === 'filters' ? 'active' : ''}`}
                  onClick={() => setActiveTab('filters')}
                >
                  &#128270; Filters
                </button>
                <button
                  className={`sidebar-tab ${activeTab === 'focus' ? 'active' : ''}`}
                  onClick={() => setActiveTab('focus')}
                >
                  &#127919; Focus
                </button>
              </div>

              {/* Tab content */}
              <div className="sidebar-content">
                {activeTab === 'config' && (
                  <>
                    <DatasetUpload />
                    <AnalysisPanel />
                  </>
                )}
                {activeTab === 'results' && <ResultsPanel />}
                {activeTab === 'scenarios' && <ScenarioPanel />}
                {activeTab === 'filters' && <FilterPanel />}
                {activeTab === 'focus' && <FocusMode />}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ── Bottom Charts Drawer ────────────────────────────────────── */}
      <div className={`charts-drawer ${chartsOpen ? 'charts-drawer--open' : 'charts-drawer--closed'}`}>
        <button className="charts-drawer-toggle" onClick={() => setChartsOpen(!chartsOpen)}>
          <span className={`toggle-arrow ${chartsOpen ? 'down' : 'up'}`}>&#9660;</span>
          Network Analytics
        </button>
        {chartsOpen && <StatsCharts />}
      </div>

      <ExplanationModal />
    </div>
  );
}
