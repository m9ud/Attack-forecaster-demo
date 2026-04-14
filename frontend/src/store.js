/* ── Zustand store — centralized state + async actions ──────────────── */

import { create } from 'zustand';
import * as api from './api';

const ALL_EDGE_TYPES = [
  'MemberOf', 'AdminTo', 'HasSession', 'CanRDP',
  'GenericAll', 'WriteDACL', 'Owns',
  'ForceChangePassword', 'ReadLAPSPassword', 'AllExtendedRights', 'DCSync',
  'GenericWrite', 'WriteOwner', 'AddSelf', 'AddMember', 'SQLAdmin',
];

const DEFAULT_NODE_FILTERS = {
  showUsers: true,
  showGroups: true,
  showServers: true,
  showComputers: true,
  highValueOnly: false,
  pathNodesOnly: false,
};

const DEFAULT_EDGE_FILTERS = {
  edgeTypes: [...ALL_EDGE_TYPES],
  hideAllEdges: false,
  minWeight: 0,
};

const DEFAULT_ANALYSIS = {
  startNodes: [],
  targetNode: 'kingslanding',
  minDepth: 1,
  maxDepth: 10,
  k: 50,
};

export const useStore = create((set, get) => ({
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
  expandedSubnets: new Set(),

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
  toggleIsolateSelectedPath: () => set((s) => ({ isolateSelectedPath: !s.isolateSelectedPath })),

  contextMenu: null,
  nodeWhatIfResult: null,
  nodeWhatIfLoading: false,

  openContextMenu: (nodeName, x, y) =>
    set({ contextMenu: { nodeName, x, y }, nodeWhatIfResult: null }),

  closeContextMenu: () => set({ contextMenu: null, nodeWhatIfResult: null }),

  runNodeWhatIf: async (nodeName, action, extra) => {
    set({ nodeWhatIfLoading: true, nodeWhatIfResult: null });
    const state = get();
    const startNodes = state.startOptions.slice(0, 4);
    const analysisParams = { startNodes, targetNode: state.analysis?.paths[0]?.nodes.at(-1) ?? '', minDepth: 1, maxDepth: 10, k: 50 };

    const daGroup = state.nodes.find((n) =>
      n.type === 'Group' && /domain admins/i.test(n.name)
    )?.name ?? 'Domain Admins';

    let mutations = [];
    if (action === 'disable')         mutations = [{ type: 'removeNode', nodeId: nodeName }];
    else if (action === 'addToDA')    mutations = [{ type: 'addEdge', source: nodeName, target: daGroup, relation: 'MemberOf', weight: 3 }];
    else if (action === 'addToProtected') mutations = [{ type: 'removeEdge', edgeId: '__none__' }];
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
  reportData: null,
  reportLoading: false,

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
    } catch (e) {
      set({ error: e.message });
    }
  },

  runAnalysis: async (startNodes, target) => {
    const params = { startNodes, targetNode: target, minDepth: 1, maxDepth: 10, k: 50 };
    set({
      loading: true, analysis: null, scenario: null, selectedPathId: null,
      scenarioHighlight: null, error: null,
      reportData: null,
      analysisParams: params,
    });
    try {
      const result = await api.runAnalysis(params);
      set({ analysis: result, loading: false });
    } catch (e) {
      set({ loading: false, error: e.message });
    }
  },

  selectPath: (pathId) => set({ selectedPathId: pathId, scenarioHighlight: null }),

  runScenario: async (id, label, mutations) => {
    set({ loading: true, error: null, selectedPathId: null });
    try {
      const state = get();
      const startNodes = state.startOptions.length > 0
        ? state.startOptions.slice(0, 4)
        : DEFAULT_ANALYSIS.startNodes;
      const analysisParams = { ...DEFAULT_ANALYSIS, startNodes };

      const beforeResult = await api.runAnalysis(analysisParams);
      const result = await api.runSimulation(id, mutations, analysisParams);

      const isOffensive = mutations.some((m) => m.type === 'addEdge');

      const removedEdgeIds = mutations
        .filter((m) => m.type === 'removeEdge' && m.edgeId)
        .map((m) => m.edgeId);

      let highlight = null;

      if (isOffensive) {
        const afterResult = await api.runAnalysis(analysisParams);
        const topAfterPath = afterResult.paths.length > 0 ? afterResult.paths[0] : null;
        if (topAfterPath) {
          highlight = {
            scenarioId: id,
            edgeIds: topAfterPath.edges.map((e) => e.edgeId),
            nodeNames: topAfterPath.nodes,
            removedEdgeIds: [],
          };
        }
      } else {
        const afterPathIds = new Set(result.after.pathIds);
        const survivingPaths = beforeResult.paths.filter(
          (p) => afterPathIds.has(p.pathId)
        );
        const topPath = survivingPaths.length > 0 ? survivingPaths[0] : null;

        highlight = topPath
          ? {
              scenarioId: id,
              edgeIds: topPath.edges.map((e) => e.edgeId),
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
    } catch (e) {
      set({ loading: false, error: e.message });
    }
  },

  loadExplanation: async (pathId) => {
    try {
      const data = await api.fetchExplanation(pathId);
      set({ explanation: data.explanation, showExplanation: true });
    } catch (e) {
      set({ error: e.message });
    }
  },

  closeExplanation: () => set({ showExplanation: false, explanation: null }),

  /* ── Dataset management ───────────────────────────────────────────── */
  uploadDataset: async (file) => {
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
    } catch (e) {
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
    } catch (e) {
      set({ datasetUploading: false, error: e.message });
    }
  },

  /* ── Cluster view ─────────────────────────────────────────────────── */
  toggleClusterView: () => set((s) => ({
    clusterView: !s.clusterView,
    expandedSubnets: new Set(),
  })),

  toggleSubnet: (subnetId) => set((s) => {
    const next = new Set(s.expandedSubnets);
    if (next.has(subnetId)) next.delete(subnetId);
    else next.add(subnetId);
    return { expandedSubnets: next };
  }),

  /* ── Filters ──────────────────────────────────────────────────────── */
  setNodeFilters: (filters) =>
    set((s) => ({ nodeFilters: { ...s.nodeFilters, ...filters } })),

  setEdgeFilters: (filters) =>
    set((s) => ({ edgeFilters: { ...s.edgeFilters, ...filters } })),

  resetFilters: () => set({
    nodeFilters: { ...DEFAULT_NODE_FILTERS },
    edgeFilters: { ...DEFAULT_EDGE_FILTERS },
  }),

  /* ── Focus mode ───────────────────────────────────────────────────── */
  setFocusNode: (nodeName) => {
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

  setFocusRadius: (radius) => {
    set({ focusRadius: radius });
    const nodeName = get().focusNode;
    if (nodeName) {
      api.fetchNeighbors(nodeName, radius).then((data) => {
        set({ focusNodes: data.nodes, focusEdges: data.edges });
      }).catch(() => {});
    }
  },

  /* ── Path animation ───────────────────────────────────────────────── */
  startAnimation: (pathId) => set({
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

  setAnimationStep: (step) => set({ animationStep: step }),
  setAnimationSpeed: (speed) => set({ animationSpeed: speed }),

  /* ── Critical nodes ───────────────────────────────────────────────── */
  loadCriticalNodes: async (startNodes, target) => {
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

  toggleCriticalNodes: () => set((s) => ({ showCriticalNodes: !s.showCriticalNodes })),

  /* ── Mitigations ──────────────────────────────────────────────────── */
  loadMitigations: async (startNodes, target) => {
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
  exportReport: async (startNodes, target) => {
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
    } catch (e) {
      set({ error: e.message });
    }
  },

  // Auto Report
  generateReport: async (params) => {
    set({ reportLoading: true, reportData: null });
    try {
      const data = await api.fetchReport(params);
      set({ reportData: data, reportLoading: false });
    } catch (e) {
      set({ reportLoading: false, error: e.message });
    }
  },
}));
