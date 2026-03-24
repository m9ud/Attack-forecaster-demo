/* ── Zustand store — centralized state + async actions ──────────────── */

import { create } from 'zustand';
import type {
  GraphNode, GraphEdge, AnalysisResult, SimulateResult,
  MutationDef, PathInfo, SubnetDef, NodeFilters, EdgeFilters,
} from './types';
import * as api from './api';
import type {
  ScenarioPreset, CriticalNode, MitigationSuggestion,
  MITREMatrixResult, ReportResult, ROIItem, ThreatIntelResult, TimelinePoint,
} from './api';

const ALL_EDGE_TYPES = [
  'MemberOf', 'AdminTo', 'HasSession', 'CanRDP',
  'GenericAll', 'WriteDACL', 'Owns',
  'ForceChangePassword', 'ReadLAPSPassword', 'AllExtendedRights', 'DCSync',
  'GenericWrite', 'WriteOwner', 'AddSelf', 'AddMember', 'SQLAdmin',
];

const DEFAULT_NODE_FILTERS: NodeFilters = {
  showUsers: true,
  showGroups: true,
  showServers: true,
  showComputers: true,
  highValueOnly: false,
  pathNodesOnly: false,
};

const DEFAULT_EDGE_FILTERS: EdgeFilters = {
  edgeTypes: [...ALL_EDGE_TYPES],
  hideAllEdges: false,
  minWeight: 0,
};

const DEFAULT_ANALYSIS = {
  startNodes: [] as string[],
  targetNode: 'kingslanding',
  minDepth: 1,
  maxDepth: 10,
  k: 50,
};

interface ScenarioHighlight {
  scenarioId: string;
  edgeIds: string[];
  nodeNames: string[];
  removedEdgeIds: string[];
}

interface AppState {
  /* data */
  nodes: GraphNode[];
  edges: GraphEdge[];
  subnets: SubnetDef[];
  startOptions: string[];
  scenarioPresets: Record<string, ScenarioPreset>;
  analysis: AnalysisResult | null;
  selectedPathId: string | null;
  scenario: SimulateResult | null;
  scenarioLabel: string;
  scenarioHighlight: ScenarioHighlight | null;
  explanation: string | null;
  showExplanation: boolean;
  loading: boolean;
  error: string | null;

  /* path isolation */
  isolateSelectedPath: boolean;
  toggleIsolateSelectedPath: () => void;

  /* node context menu */
  contextMenu: { nodeName: string; x: number; y: number } | null;
  nodeWhatIfResult: { totalPathsBefore: number; totalPathsAfter: number; globalRiskBefore: number; globalRiskAfter: number; eliminated: number } | null;
  nodeWhatIfLoading: boolean;
  openContextMenu: (nodeName: string, x: number, y: number) => void;
  closeContextMenu: () => void;
  runNodeWhatIf: (nodeName: string, action: 'disable' | 'addToDA' | 'addToProtected' | 'addEdge', extra?: { source?: string; target?: string; relation?: string }) => Promise<void>;

  /* critical nodes */
  criticalNodes: CriticalNode[];
  showCriticalNodes: boolean;
  criticalNodesLoading: boolean;

  /* mitigations */
  mitigations: MitigationSuggestion[];
  mitigationsLoading: boolean;

  /* analysis params (used by new panels) */
  analysisParams: { startNodes: string[]; targetNode: string; minDepth: number; maxDepth: number; k: number };

  /* MITRE ATT&CK */
  mitreData: MITREMatrixResult | null;
  mitreLoading: boolean;

  /* auto report */
  reportData: ReportResult | null;
  reportLoading: boolean;

  /* defense ROI */
  roiData: ROIItem[] | null;
  roiLoading: boolean;

  /* threat intel */
  intelData: ThreatIntelResult | null;
  intelLoading: boolean;

  /* timeline */
  timelineData: TimelinePoint[] | null;
  timelineLoading: boolean;

  /* cluster/subnet view */
  clusterView: boolean;
  expandedSubnets: Set<string>;

  /* filters */
  nodeFilters: NodeFilters;
  edgeFilters: EdgeFilters;

  /* focus mode */
  focusNode: string | null;
  focusRadius: number;
  focusNodes: GraphNode[];
  focusEdges: GraphEdge[];

  /* path animation */
  animatingPathId: string | null;
  animationStep: number;
  animationPlaying: boolean;
  animationSpeed: number;

  /* actions */
  loadGraph: () => Promise<void>;
  runAnalysis: (startNodes: string[], target: string) => Promise<void>;
  selectPath: (pathId: string | null) => void;
  runScenario: (id: string, label: string, mutations: MutationDef[]) => Promise<void>;
  loadExplanation: (pathId: string) => Promise<void>;
  closeExplanation: () => void;

  /* critical nodes actions */
  loadCriticalNodes: (startNodes: string[], target: string) => Promise<void>;
  toggleCriticalNodes: () => void;

  /* mitigations actions */
  loadMitigations: (startNodes: string[], target: string) => Promise<void>;

  /* export action */
  exportReport: (startNodes: string[], target: string) => Promise<void>;

  /* new feature actions */
  loadMITRE: (params: { startNodes: string[]; targetNode: string; minDepth: number; maxDepth: number; k: number }) => Promise<void>;
  generateReport: (params: { startNodes: string[]; targetNode: string; minDepth: number; maxDepth: number; k: number }) => Promise<void>;
  loadROI: (params: { startNodes: string[]; targetNode: string; minDepth: number; maxDepth: number; k: number }) => Promise<void>;
  loadIntel: (params: { startNodes: string[]; targetNode: string; minDepth: number; maxDepth: number; k: number }) => Promise<void>;
  loadTimeline: (params: { startNodes: string[]; targetNode: string; minDepth: number; maxDepth: number; k: number }) => Promise<void>;

  /* dataset actions */
  uploadDataset: (file: File) => Promise<void>;
  resetDataset: () => Promise<void>;
  datasetUploading: boolean;

  /* cluster actions */
  toggleClusterView: () => void;
  toggleSubnet: (subnetId: string) => void;

  /* filter actions */
  setNodeFilters: (filters: Partial<NodeFilters>) => void;
  setEdgeFilters: (filters: Partial<EdgeFilters>) => void;
  resetFilters: () => void;

  /* focus actions */
  setFocusNode: (nodeName: string | null) => void;
  setFocusRadius: (radius: number) => void;

  /* animation actions */
  startAnimation: (pathId: string) => void;
  stopAnimation: () => void;
  pauseAnimation: () => void;
  resumeAnimation: () => void;
  setAnimationStep: (step: number) => void;
  setAnimationSpeed: (speed: number) => void;
}

export const useStore = create<AppState>((set: any, get: any) => ({
  nodes: [],
  edges: [],
  subnets: [],
  startOptions: [],
  scenarioPresets: {},
  analysis: null,
  selectedPathId: null,
  scenario: null,
  scenarioLabel: '',
  scenarioHighlight: null,
  explanation: null,
  showExplanation: false,
  loading: false,
  error: null,

  clusterView: false,
  expandedSubnets: new Set<string>(),

  nodeFilters: { ...DEFAULT_NODE_FILTERS },
  edgeFilters: { ...DEFAULT_EDGE_FILTERS },

  focusNode: null,
  focusRadius: 2,
  focusNodes: [],
  focusEdges: [],

  animatingPathId: null,
  animationStep: -1,
  animationPlaying: false,
  animationSpeed: 1000,
  datasetUploading: false,

  isolateSelectedPath: false,
  toggleIsolateSelectedPath: () => set((s: AppState) => ({ isolateSelectedPath: !s.isolateSelectedPath })),

  contextMenu: null,
  nodeWhatIfResult: null,
  nodeWhatIfLoading: false,

  openContextMenu: (nodeName: string, x: number, y: number) =>
    set({ contextMenu: { nodeName, x, y }, nodeWhatIfResult: null }),

  closeContextMenu: () => set({ contextMenu: null, nodeWhatIfResult: null }),

  runNodeWhatIf: async (nodeName: string, action: string, extra?: { source?: string; target?: string; relation?: string; weight?: number }) => {
    set({ nodeWhatIfLoading: true, nodeWhatIfResult: null });
    const state = get();
    const startNodes = state.startOptions.slice(0, 4);
    const analysisParams = { startNodes, targetNode: state.analysis?.paths[0]?.nodes.at(-1) ?? '', minDepth: 1, maxDepth: 10, k: 50 };

    // Find DA group name
    const daGroup = state.nodes.find((n: any) =>
      n.type === 'Group' && /domain admins/i.test(n.name)
    )?.name ?? 'Domain Admins';

    let mutations: any[] = [];
    if (action === 'disable')         mutations = [{ type: 'removeNode', nodeId: nodeName }];
    else if (action === 'addToDA')    mutations = [{ type: 'addEdge', source: nodeName, target: daGroup, relation: 'MemberOf', weight: 3 }];
    else if (action === 'addToProtected') mutations = [{ type: 'removeEdge', edgeId: '__none__' }]; // symbolic — no real effect shown below
    else if (action === 'addEdge' && extra) mutations = [{ type: 'addEdge', source: extra.source, target: extra.target, relation: extra.relation, weight: extra.weight ?? 5 }];

    try {
      const result = await api.runSimulation('node-whatif', mutations, analysisParams);
      set({
        nodeWhatIfLoading: false,
        nodeWhatIfResult: {
          totalPathsBefore: result.before.totalPaths,
          totalPathsAfter:  result.after.totalPaths,
          globalRiskBefore: result.before.globalRisk,
          globalRiskAfter:  result.after.globalRisk,
          eliminated:       result.delta.eliminatedPaths,
        },
      });
    } catch {
      set({ nodeWhatIfLoading: false });
    }
  },

  criticalNodes: [],
  showCriticalNodes: false,
  criticalNodesLoading: false,

  mitigations: [],
  mitigationsLoading: false,

  analysisParams: { startNodes: [], targetNode: 'kingslanding', minDepth: 1, maxDepth: 10, k: 50 },
  mitreData: null,
  mitreLoading: false,
  reportData: null,
  reportLoading: false,
  roiData: null,
  roiLoading: false,
  intelData: null,
  intelLoading: false,
  timelineData: null,
  timelineLoading: false,

  loadGraph: async () => {
    try {
      const [data, subnets, startOptions, scenarioPresets] = await Promise.all([
        api.fetchGraph(),
        api.fetchSubnets(),
        api.fetchStartOptions(),
        api.fetchScenarios(),
      ]);
      DEFAULT_ANALYSIS.startNodes = startOptions.slice(0, 4);
      set({ nodes: data.nodes, edges: data.edges, subnets, startOptions, scenarioPresets });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  runAnalysis: async (startNodes: string[], target: string) => {
    const params = { startNodes, targetNode: target, minDepth: 1, maxDepth: 10, k: 50 };
    set({
      loading: true, analysis: null, scenario: null, selectedPathId: null,
      scenarioHighlight: null, error: null,
      mitreData: null, reportData: null, roiData: null, intelData: null, timelineData: null,
      analysisParams: params,
    });
    try {
      const result = await api.runAnalysis(params);
      set({ analysis: result, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e.message });
    }
  },

  selectPath: (pathId: string | null) => set({ selectedPathId: pathId, scenarioHighlight: null }),

  runScenario: async (id: string, label: string, mutations: MutationDef[]) => {
    set({ loading: true, error: null, selectedPathId: null });
    try {
      const state = get();
      const startNodes = state.startOptions.length > 0
        ? state.startOptions.slice(0, 4)
        : DEFAULT_ANALYSIS.startNodes;
      const analysisParams = { ...DEFAULT_ANALYSIS, startNodes };

      const beforeResult = await api.runAnalysis(analysisParams);
      const result = await api.runSimulation(id, mutations, analysisParams);

      // Determine if offensive (addEdge) or defensive (removeEdge/removeNode)
      const isOffensive = mutations.some((m) => m.type === 'addEdge');

      const removedEdgeIds = mutations
        .filter((m) => m.type === 'removeEdge' && m.edgeId)
        .map((m) => m.edgeId as string);

      let highlight: ScenarioHighlight | null = null;

      if (isOffensive) {
        // For offensive: re-run analysis with mutations to get the new paths
        // Use the after pathIds to find new dangerous paths
        const afterResult = await api.runAnalysis(analysisParams);
        // The top path from the simulation's after analysis
        const topAfterPath = afterResult.paths.length > 0 ? afterResult.paths[0] : null;
        if (topAfterPath) {
          highlight = {
            scenarioId: id,
            edgeIds: topAfterPath.edges.map((e: any) => e.edgeId),
            nodeNames: topAfterPath.nodes,
            removedEdgeIds: [],
          };
        }
      } else {
        // For defensive: show top surviving path
        const afterPathIds = new Set(result.after.pathIds);
        const survivingPaths = beforeResult.paths.filter(
          (p: PathInfo) => afterPathIds.has(p.pathId)
        );
        const topPath = survivingPaths.length > 0 ? survivingPaths[0] : null;

        highlight = topPath
          ? {
              scenarioId: id,
              edgeIds: topPath.edges.map((e: any) => e.edgeId),
              nodeNames: topPath.nodes,
              removedEdgeIds,
            }
          : removedEdgeIds.length > 0
          ? { scenarioId: id, edgeIds: [], nodeNames: [], removedEdgeIds }
          : null;
      }

      set({
        analysis: beforeResult,
        scenario: result,
        scenarioLabel: label,
        scenarioHighlight: highlight,
        loading: false,
      });
    } catch (e: any) {
      set({ loading: false, error: e.message });
    }
  },

  loadExplanation: async (pathId: string) => {
    try {
      const data = await api.fetchExplanation(pathId);
      set({ explanation: data.explanation, showExplanation: true });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  closeExplanation: () => set({ showExplanation: false, explanation: null }),

  /* ── Dataset management ───────────────────────────────────────────── */
  uploadDataset: async (file: File) => {
    set({ datasetUploading: true, error: null, analysis: null, scenario: null, selectedPathId: null, scenarioHighlight: null });
    try {
      await api.uploadDataset(file);
      const [data, subnets, startOptions, scenarioPresets] = await Promise.all([
        api.fetchGraph(),
        api.fetchSubnets(),
        api.fetchStartOptions(),
        api.fetchScenarios(),
      ]);
      set({ nodes: data.nodes, edges: data.edges, subnets, startOptions, scenarioPresets, datasetUploading: false });
    } catch (e: any) {
      set({ datasetUploading: false, error: e.message });
    }
  },

  resetDataset: async () => {
    set({ datasetUploading: true, error: null, analysis: null, scenario: null, selectedPathId: null, scenarioHighlight: null });
    try {
      await api.resetDataset();
      const [data, subnets, startOptions, scenarioPresets] = await Promise.all([
        api.fetchGraph(),
        api.fetchSubnets(),
        api.fetchStartOptions(),
        api.fetchScenarios(),
      ]);
      set({ nodes: data.nodes, edges: data.edges, subnets, startOptions, scenarioPresets, datasetUploading: false });
    } catch (e: any) {
      set({ datasetUploading: false, error: e.message });
    }
  },

  /* ── Cluster view ─────────────────────────────────────────────────── */
  toggleClusterView: () => set((s: AppState) => ({
    clusterView: !s.clusterView,
    expandedSubnets: new Set<string>(),
  })),

  toggleSubnet: (subnetId: string) => set((s: AppState) => {
    const next = new Set(s.expandedSubnets);
    if (next.has(subnetId)) next.delete(subnetId);
    else next.add(subnetId);
    return { expandedSubnets: next };
  }),

  /* ── Filters ──────────────────────────────────────────────────────── */
  setNodeFilters: (filters: Partial<NodeFilters>) =>
    set((s: AppState) => ({ nodeFilters: { ...s.nodeFilters, ...filters } })),

  setEdgeFilters: (filters: Partial<EdgeFilters>) =>
    set((s: AppState) => ({ edgeFilters: { ...s.edgeFilters, ...filters } })),

  resetFilters: () => set({
    nodeFilters: { ...DEFAULT_NODE_FILTERS },
    edgeFilters: { ...DEFAULT_EDGE_FILTERS },
  }),

  /* ── Focus mode ───────────────────────────────────────────────────── */
  setFocusNode: (nodeName: string | null) => {
    if (!nodeName) {
      set({ focusNode: null, focusNodes: [], focusEdges: [] });
      return;
    }
    set({ focusNode: nodeName });
    const radius = get().focusRadius;
    api.fetchNeighbors(nodeName, radius).then((data) => {
      set({ focusNodes: data.nodes, focusEdges: data.edges });
    }).catch(() => {});
  },

  setFocusRadius: (radius: number) => {
    set({ focusRadius: radius });
    const nodeName = get().focusNode;
    if (nodeName) {
      api.fetchNeighbors(nodeName, radius).then((data) => {
        set({ focusNodes: data.nodes, focusEdges: data.edges });
      }).catch(() => {});
    }
  },

  /* ── Path animation ───────────────────────────────────────────────── */
  startAnimation: (pathId: string) => set({
    animatingPathId: pathId,
    animationStep: 0,
    animationPlaying: true,
  }),

  stopAnimation: () => set({
    animatingPathId: null,
    animationStep: -1,
    animationPlaying: false,
  }),

  pauseAnimation: () => set({ animationPlaying: false }),
  resumeAnimation: () => set({ animationPlaying: true }),

  setAnimationStep: (step: number) => set({ animationStep: step }),
  setAnimationSpeed: (speed: number) => set({ animationSpeed: speed }),

  /* ── Critical nodes ───────────────────────────────────────────────── */
  loadCriticalNodes: async (startNodes: string[], target: string) => {
    set({ criticalNodesLoading: true });
    try {
      const nodes = await api.fetchCriticalNodes({
        startNodes, targetNode: target, minDepth: 1, maxDepth: 10, k: 50,
      });
      set({ criticalNodes: nodes, criticalNodesLoading: false });
    } catch {
      set({ criticalNodesLoading: false });
    }
  },

  toggleCriticalNodes: () => set((s: AppState) => ({ showCriticalNodes: !s.showCriticalNodes })),

  /* ── Mitigations ──────────────────────────────────────────────────── */
  loadMitigations: async (startNodes: string[], target: string) => {
    set({ mitigationsLoading: true });
    try {
      const suggestions = await api.fetchMitigations({
        startNodes, targetNode: target, minDepth: 1, maxDepth: 10, k: 50,
      });
      set({ mitigations: suggestions, mitigationsLoading: false });
    } catch {
      set({ mitigationsLoading: false });
    }
  },

  /* ── Export ───────────────────────────────────────────────────────── */
  exportReport: async (startNodes: string[], target: string) => {
    try {
      const data = await api.exportAnalysis({
        startNodes, targetNode: target, minDepth: 1, maxDepth: 10, k: 50,
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apf-report-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  /* ── MITRE ATT&CK ─────────────────────────────────────────────────── */
  loadMITRE: async (params) => {
    set({ mitreLoading: true });
    try {
      const data = await api.fetchMITREMatrix(params);
      set({ mitreData: data, mitreLoading: false });
    } catch (e: any) {
      set({ mitreLoading: false, error: e.message });
    }
  },

  /* ── Auto Report ──────────────────────────────────────────────────── */
  generateReport: async (params) => {
    set({ reportLoading: true, reportData: null });
    try {
      const data = await api.fetchReport(params);
      set({ reportData: data, reportLoading: false });
    } catch (e: any) {
      set({ reportLoading: false, error: e.message });
    }
  },

  /* ── Defense ROI ──────────────────────────────────────────────────── */
  loadROI: async (params) => {
    set({ roiLoading: true });
    try {
      const data = await api.fetchROI(params);
      set({ roiData: data, roiLoading: false });
    } catch (e: any) {
      set({ roiLoading: false, error: e.message });
    }
  },

  /* ── Threat Intel ─────────────────────────────────────────────────── */
  loadIntel: async (params) => {
    set({ intelLoading: true });
    try {
      const data = await api.fetchThreatIntel(params);
      set({ intelData: data, intelLoading: false });
    } catch (e: any) {
      set({ intelLoading: false, error: e.message });
    }
  },

  /* ── Timeline ─────────────────────────────────────────────────────── */
  loadTimeline: async (params) => {
    set({ timelineLoading: true });
    try {
      const data = await api.fetchTimeline(params);
      set({ timelineData: data, timelineLoading: false });
    } catch (e: any) {
      set({ timelineLoading: false, error: e.message });
    }
  },
}));
