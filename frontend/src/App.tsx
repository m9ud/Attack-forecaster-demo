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
import LetterGlitch from './components/LetterGlitch';
import CriticalNodesPanel from './components/CriticalNodesPanel';
import MitigationsPanel from './components/MitigationsPanel';
import NodeContextMenu from './components/NodeContextMenu';
import MITREPanel from './components/MITREPanel';
import ReportPanel from './components/ReportPanel';
import ROIPanel from './components/ROIPanel';
import TimelineMachine from './components/TimelineMachine';
import ThreatIntelPanel from './components/ThreatIntelPanel';
import {
  ZapIcon, GlobeIcon, BarChartIcon, PanelRightIcon,
  SettingsIcon, SlidersIcon, CrosshairIcon,
  AlertTriangleIcon, SearchIcon, LoaderIcon,
  ChevronDownIcon, ChevronUpIcon, NetworkIcon,
  TargetIcon, ShieldIcon, GridIcon, FileTextIcon,
  DollarSignIcon, CalendarIcon, BugIcon,
} from './components/Icons';

type TabId =
  | 'config' | 'results' | 'scenarios' | 'filters'
  | 'focus'  | 'critical' | 'mitigate'
  | 'mitre'  | 'report'   | 'roi'      | 'timeline' | 'intel';

const TABS: { id: TabId; label: string; icon: React.ReactNode; title: string }[] = [
  { id: 'config',    label: 'Config',    icon: <SettingsIcon size={13} />,     title: 'Configuration' },
  { id: 'results',   label: 'Results',   icon: <BarChartIcon size={13} />,     title: 'Analysis Results' },
  { id: 'scenarios', label: 'Scenarios', icon: <ZapIcon size={13} />,          title: 'Scenarios' },
  { id: 'filters',   label: 'Filters',   icon: <SlidersIcon size={13} />,      title: 'Filters' },
  { id: 'focus',     label: 'Focus',     icon: <CrosshairIcon size={13} />,    title: 'Focus Mode' },
  { id: 'critical',  label: 'Nodes',     icon: <TargetIcon size={13} />,       title: 'Critical Nodes' },
  { id: 'mitigate',  label: 'Mitigate',  icon: <ShieldIcon size={13} />,       title: 'Mitigations' },
  { id: 'mitre',     label: 'MITRE',     icon: <GridIcon size={13} />,         title: 'MITRE ATT&CK Matrix' },
  { id: 'report',    label: 'Report',    icon: <FileTextIcon size={13} />,     title: 'Auto Report Generator' },
  { id: 'roi',       label: 'ROI',       icon: <DollarSignIcon size={13} />,   title: 'Defense ROI Calculator' },
  { id: 'timeline',  label: 'Timeline',  icon: <CalendarIcon size={13} />,     title: 'What-If Time Machine' },
  { id: 'intel',     label: 'Intel',     icon: <BugIcon size={13} />,          title: 'Threat Intelligence Feed' },
];

export default function App() {
  const loading               = useStore((s: any) => s.loading);
  const error                 = useStore((s: any) => s.error);
  const analysis              = useStore((s: any) => s.analysis);
  const nodes                 = useStore((s: any) => s.nodes);
  const edges                 = useStore((s: any) => s.edges);
  const clusterView           = useStore((s: any) => s.clusterView);
  const toggleClusterView     = useStore((s: any) => s.toggleClusterView);
  const focusNode             = useStore((s: any) => s.focusNode);
  const selectedPathId        = useStore((s: any) => s.selectedPathId);
  const animatingPathId       = useStore((s: any) => s.animatingPathId);
  const isolateSelectedPath   = useStore((s: any) => s.isolateSelectedPath);
  const toggleIsolateSelectedPath = useStore((s: any) => s.toggleIsolateSelectedPath);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chartsOpen,  setChartsOpen]  = useState(false);
  const [activeTab,   setActiveTab]   = useState<TabId>('config');

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
                <ZapIcon size={20} className="landing-brand-icon" />
                <span className="landing-brand-name">Attack Path Forecaster</span>
              </div>
              <h2 className="landing-heading">Load a Dataset to Begin</h2>
              <p className="landing-subtext">
                Drop a BloodHound-style JSON file to visualise your Active Directory attack graph,
                rank paths by risk, and simulate defences.
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
          <ZapIcon size={18} className="topbar-logo-icon" />
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
                    {/* new-feature indicator */}
                    {['mitre','report','roi','timeline','intel'].includes(tab.id) && (
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
                {activeTab === 'focus'     && <FocusMode />}
                {activeTab === 'critical'  && <CriticalNodesPanel />}
                {activeTab === 'mitigate'  && <MitigationsPanel />}
                {activeTab === 'mitre'     && <MITREPanel />}
                {activeTab === 'report'    && <ReportPanel />}
                {activeTab === 'roi'       && <ROIPanel />}
                {activeTab === 'timeline'  && <TimelineMachine />}
                {activeTab === 'intel'     && <ThreatIntelPanel />}
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
