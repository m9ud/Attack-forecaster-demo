/* ── Shared Types (mirrors backend models) ─────────────────────────────── */

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  privilegeLevel: string;
  highValue: boolean;
  subnet: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  weight: number;
}

export interface PathEdge {
  edgeId: string;
  source: string;
  target: string;
  relation: string;
  weight: number;
}

export interface PathInfo {
  pathId: string;
  nodes: string[];
  edges: PathEdge[];
  hops: number;
  edgeTypes: string[];
  sumWeights: number;
  risk: number;
  normalizedScore: number;
  impactEstimation: string;
  throughCritical: boolean;
  criticalEdgesInPath: string[];
}

export interface CriticalEdge {
  edgeId: string;
  source: string;
  relation: string;
  target: string;
  traversalCount: number;
  percentOfPaths: number;
}

export interface AnalysisResult {
  totalPaths: number;
  paths: PathInfo[];
  top5: PathInfo[];
  shortestHops: number;
  criticalEdges: CriticalEdge[];
  globalRisk: number;
}

export interface AnalysisSummary {
  totalPaths: number;
  globalRisk: number;
  shortestHops: number;
  highValueTargetsReachable: number;
  pathIds: string[];
}

export interface SimulateResult {
  before: AnalysisSummary;
  after: AnalysisSummary;
  delta: {
    pathReduction: number;
    riskReductionPercent: number;
    eliminatedPaths: number;
  };
}

export interface MutationDef {
  type: string;
  edgeId?: string;
  nodeId?: string;
  source?: string;
  target?: string;
  relation?: string;
  weight?: number;
}

export interface SubnetDef {
  id: string;
  cidr: string;
  label: string;
}

export interface NodeFilters {
  showUsers: boolean;
  showGroups: boolean;
  showServers: boolean;
  showComputers: boolean;
  highValueOnly: boolean;
  pathNodesOnly: boolean;
}

export interface EdgeFilters {
  edgeTypes: string[];
  hideAllEdges: boolean;
  minWeight: number;
}
