/* ── API client — talks to FastAPI backend on port 8000 ──────────────── */

import type { AnalysisResult, GraphNode, GraphEdge, SimulateResult, MutationDef, SubnetDef } from './types';

const API = 'http://localhost:8000';

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
