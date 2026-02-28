/* ── Zustand store — centralized state + async actions ──────────────── */

import { create } from 'zustand';
import type {
  GraphNode, GraphEdge, AnalysisResult, SimulateResult,
  MutationDef, PathInfo, SubnetDef, NodeFilters, EdgeFilters,
} from './types';
import * as api from './api';

const ALL_EDGE_TYPES = [
  'MemberOf', 'AdminTo', 'HasSession', 'CanRDP',
  'GenericAll', 'WriteDACL', 'Owns',
  'ForceChangePassword', 'ReadLAPSPassword', 'AllExtendedRights', 'DCSync',
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
  targetNode: 'DC01',
  minDepth: 1,
  maxDepth: 7,
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
  analysis: AnalysisResult | null;
  selectedPathId: string | null;
  scenario: SimulateResult | null;
  scenarioLabel: string;
  scenarioHighlight: ScenarioHighlight | null;
  explanation: string | null;
  showExplanation: boolean;
  loading: boolean;
  error: string | null;

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

  loadGraph: async () => {
    try {
      const [data, subnets, startOptions] = await Promise.all([
        api.fetchGraph(),
        api.fetchSubnets(),
        api.fetchStartOptions(),
      ]);
      // Initialize default analysis start nodes
      DEFAULT_ANALYSIS.startNodes = startOptions.slice(0, 4);
      set({ nodes: data.nodes, edges: data.edges, subnets, startOptions });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  runAnalysis: async (startNodes: string[], target: string) => {
    set({ loading: true, analysis: null, scenario: null, selectedPathId: null, scenarioHighlight: null, error: null });
    try {
      const result = await api.runAnalysis({
        startNodes,
        targetNode: target,
        minDepth: 1,
        maxDepth: 7,
        k: 50,
      });
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
      // Reload graph with new dataset
      const [data, subnets, startOptions] = await Promise.all([
        api.fetchGraph(),
        api.fetchSubnets(),
        api.fetchStartOptions(),
      ]);
      set({ nodes: data.nodes, edges: data.edges, subnets, startOptions, datasetUploading: false });
    } catch (e: any) {
      set({ datasetUploading: false, error: e.message });
    }
  },

  resetDataset: async () => {
    set({ datasetUploading: true, error: null, analysis: null, scenario: null, selectedPathId: null, scenarioHighlight: null });
    try {
      await api.resetDataset();
      const [data, subnets, startOptions] = await Promise.all([
        api.fetchGraph(),
        api.fetchSubnets(),
        api.fetchStartOptions(),
      ]);
      set({ nodes: data.nodes, edges: data.edges, subnets, startOptions, datasetUploading: false });
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
}));
