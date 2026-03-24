/* ── API client — talks to FastAPI backend on port 8000 ──────────────── */

import type { AnalysisResult, GraphNode, GraphEdge, SimulateResult, MutationDef, SubnetDef } from './types';

export const API = 'http://localhost:8000';

export async function fetchGraph(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const r = await fetch(`${API}/graph`);
  if (!r.ok) throw new Error('Failed to load graph');
  return r.json();
}

export async function fetchSubnets(): Promise<SubnetDef[]> {
  const r = await fetch(`${API}/subnets`);
  if (!r.ok) throw new Error('Failed to load subnets');
  return r.json();
}

export async function fetchStartOptions(): Promise<string[]> {
  const r = await fetch(`${API}/start-options`);
  if (!r.ok) throw new Error('Failed to load start options');
  return r.json();
}

export async function fetchNeighbors(nodeName: string, radius: number): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const r = await fetch(`${API}/neighbors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeName, radius }),
  });
  if (!r.ok) throw new Error('Failed to load neighbors');
  return r.json();
}

export async function runAnalysis(params: {
  startNodes: string[];
  targetNode: string;
  minDepth: number;
  maxDepth: number;
  k: number;
}): Promise<AnalysisResult> {
  const r = await fetch(`${API}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!r.ok) throw new Error('Analysis failed');
  return r.json();
}

export async function fetchExplanation(pathId: string): Promise<{ pathId: string; explanation: string }> {
  const r = await fetch(`${API}/explain?pathId=${encodeURIComponent(pathId)}`);
  if (!r.ok) throw new Error('Explanation not found');
  return r.json();
}

export async function runSimulation(
  scenarioId: string,
  mutations: MutationDef[],
  analysis: {
    startNodes: string[];
    targetNode: string;
    minDepth: number;
    maxDepth: number;
    k: number;
  },
): Promise<SimulateResult> {
  const r = await fetch(`${API}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId, mutations, analysis }),
  });
  if (!r.ok) throw new Error('Simulation failed');
  return r.json();
}

/* ── Dataset management ────────────────────────────────────────────── */

export interface DatasetInfo {
  nodes: number;
  edges: number;
  subnets: number;
  scenarios: number;
  startOptions: string[];
}

export async function uploadDataset(file: File): Promise<DatasetInfo & { status: string; message: string }> {
  const form = new FormData();
  form.append('file', file);
  const r = await fetch(`${API}/upload-dataset`, {
    method: 'POST',
    body: form,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: 'Upload failed' }));
    const msg = err.validationErrors
      ? `Validation errors:\n${err.validationErrors.join('\n')}`
      : err.detail || 'Upload failed';
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return r.json();
}

export async function resetDataset(): Promise<DatasetInfo & { status: string; message: string }> {
  const r = await fetch(`${API}/reset-dataset`, { method: 'POST' });
  if (!r.ok) throw new Error('Reset failed');
  return r.json();
}

export async function fetchDatasetInfo(): Promise<DatasetInfo> {
  const r = await fetch(`${API}/dataset-info`);
  if (!r.ok) throw new Error('Failed to load dataset info');
  return r.json();
}

export interface ScenarioPreset {
  label: string;
  description: string;
  mutations: MutationDef[];
}

export async function fetchScenarios(): Promise<Record<string, ScenarioPreset>> {
  const r = await fetch(`${API}/scenarios`);
  if (!r.ok) throw new Error('Failed to load scenarios');
  return r.json();
}

// ── Advanced analytics ───────────────────────────────────────────────────────

export interface CriticalNode {
  name: string;
  type: string;
  privilegeLevel: string;
  highValue: boolean;
  betweenness: number;
  pathTraversals: number;
  criticalityScore: number;
}

export interface MitigationSuggestion {
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  category: string;
  title: string;
  detail: string;
}

export async function fetchCriticalNodes(params: {
  startNodes: string[];
  targetNode: string;
  minDepth: number;
  maxDepth: number;
  k: number;
}): Promise<CriticalNode[]> {
  const r = await fetch(`${API}/critical-nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!r.ok) throw new Error('Failed to compute critical nodes');
  return r.json();
}

export async function fetchMitigations(params: {
  startNodes: string[];
  targetNode: string;
  minDepth: number;
  maxDepth: number;
  k: number;
}): Promise<MitigationSuggestion[]> {
  const r = await fetch(`${API}/mitigations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!r.ok) throw new Error('Failed to fetch mitigations');
  return r.json();
}

export async function exportAnalysis(params: {
  startNodes: string[];
  targetNode: string;
  minDepth: number;
  maxDepth: number;
  k: number;
}): Promise<object> {
  const r = await fetch(`${API}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!r.ok) throw new Error('Export failed');
  return r.json();
}

// ── MITRE ATT&CK ─────────────────────────────────────────────────────────────

export interface MITRETechnique {
  id: string;
  techniqueId: string;
  subTechniqueId: string | null;
  name: string;
  tactic: string;
  tacticId: string;
  severity: string;
  description: string;
  usageCount: number;
  relations: string[];
  pathIds: string[];
}

export interface MITREMatrixResult {
  techniques: MITRETechnique[];
  totalTechniques: number;
  navigatorLayer: object;
  totalPaths: number;
  globalRisk: number;
}

export async function fetchMITREMatrix(params: {
  startNodes: string[];
  targetNode: string;
  minDepth: number;
  maxDepth: number;
  k: number;
}): Promise<MITREMatrixResult> {
  const r = await fetch(`${API}/mitre-matrix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!r.ok) throw new Error('MITRE matrix fetch failed');
  return r.json();
}

// ── Auto Report ───────────────────────────────────────────────────────────────

export interface ReportResult {
  markdown: string;
  generatedAt: string;
  globalRisk: number;
  totalPaths: number;
}

export async function fetchReport(params: {
  startNodes: string[];
  targetNode: string;
  minDepth: number;
  maxDepth: number;
  k: number;
}): Promise<ReportResult> {
  const r = await fetch(`${API}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis: params, format: 'markdown' }),
  });
  if (!r.ok) throw new Error('Report generation failed');
  return r.json();
}

// ── Defense ROI ───────────────────────────────────────────────────────────────

export interface ROIItem {
  edgeId: string;
  source: string;
  target: string;
  relation: string;
  pathsEliminated: number;
  riskReductionPercent: number;
  riskReductionAbsolute: number;
  percentOfPaths: number;
  fixComplexity: 'Low' | 'Medium' | 'High';
  estimatedDays: number;
  roiScore: number;
}

export async function fetchROI(params: {
  startNodes: string[];
  targetNode: string;
  minDepth: number;
  maxDepth: number;
  k: number;
}): Promise<ROIItem[]> {
  const r = await fetch(`${API}/roi-calculator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!r.ok) throw new Error('ROI calculation failed');
  return r.json();
}

// ── Threat Intel ──────────────────────────────────────────────────────────────

export interface CVEEntry {
  cveId: string;
  severity: string;
  cvssScore: number;
  description: string;
  affectedSoftware: string;
  exploitAvailable: boolean;
  patchAvailable: boolean;
  publishedDate: string;
}

export interface NodeIntel {
  nodeName: string;
  cves: CVEEntry[];
  totalCVEs: number;
  criticalCount: number;
  highCount: number;
  exploitableCount: number;
  riskBoost: number;
  lastUpdated: string;
  category: string;
  nodeType: string;
}

export interface ThreatIntelResult {
  items: NodeIntel[];
  totalNodes: number;
  totalCVEs: number;
  exploitableCount: number;
}

export async function fetchThreatIntel(params: {
  startNodes: string[];
  targetNode: string;
  minDepth: number;
  maxDepth: number;
  k: number;
}): Promise<ThreatIntelResult> {
  const r = await fetch(`${API}/threat-intel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!r.ok) throw new Error('Threat intel fetch failed');
  return r.json();
}

// ── What-If Timeline ──────────────────────────────────────────────────────────

export interface TimelinePoint {
  label: string;
  description: string;
  globalRisk: number;
  totalPaths: number;
  riskReductionPercent: number;
  mitigationsApplied: string[];
}

export async function fetchTimeline(params: {
  startNodes: string[];
  targetNode: string;
  minDepth: number;
  maxDepth: number;
  k: number;
}): Promise<TimelinePoint[]> {
  const r = await fetch(`${API}/timeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!r.ok) throw new Error('Timeline simulation failed');
  return r.json();
}
