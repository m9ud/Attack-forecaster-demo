"""Pydantic models for request / response shapes."""

from __future__ import annotations
from pydantic import BaseModel
from typing import Optional


# ── Graph ───────────────────────────────────────────────────────────────────
class GraphNode(BaseModel):
    id: str
    name: str
    type: str
    privilegeLevel: str = ""
    highValue: bool = False
    subnet: str = ""


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relation: str
    weight: int


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


# ── Analysis ────────────────────────────────────────────────────────────────
class AnalysisRequest(BaseModel):
    startNodes: list[str]
    targetNode: str = "kingslanding"
    minDepth: int = 3
    maxDepth: int = 10
    k: int = 50


class PathEdgeInfo(BaseModel):
    edgeId: str
    source: str
    target: str
    relation: str
    weight: int


class PathInfo(BaseModel):
    pathId: str
    nodes: list[str]
    edges: list[PathEdgeInfo]
    hops: int
    edgeTypes: list[str]
    sumWeights: int
    risk: float
    normalizedScore: float = 0.0
    impactEstimation: str = "Low"
    throughCritical: bool
    criticalEdgesInPath: list[str] = []


class CriticalEdge(BaseModel):
    edgeId: str
    source: str
    relation: str
    target: str
    traversalCount: int
    percentOfPaths: float


class AnalysisResponse(BaseModel):
    totalPaths: int
    paths: list[PathInfo]
    top5: list[PathInfo]
    shortestHops: int
    criticalEdges: list[CriticalEdge]
    globalRisk: float


# ── Simulation ──────────────────────────────────────────────────────────────
class Mutation(BaseModel):
    type: str          # "removeEdge" | "removeNode" | "addEdge"
    edgeId: Optional[str] = None
    nodeId: Optional[str] = None
    source: Optional[str] = None
    target: Optional[str] = None
    relation: Optional[str] = None
    weight: Optional[int] = None


class SimulateRequest(BaseModel):
    scenarioId: str
    mutations: list[Mutation]
    analysis: AnalysisRequest


class AnalysisSummary(BaseModel):
    totalPaths: int
    globalRisk: float
    shortestHops: int
    highValueTargetsReachable: int
    pathIds: list[str]


class DeltaInfo(BaseModel):
    pathReduction: int
    riskReductionPercent: float
    eliminatedPaths: int


class SimulateResponse(BaseModel):
    before: AnalysisSummary
    after: AnalysisSummary
    delta: DeltaInfo


class NeighborRequest(BaseModel):
    nodeName: str
    radius: int = 2


class NeighborResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


# ── Critical Nodes ───────────────────────────────────────────────────────────
class CriticalNode(BaseModel):
    name: str
    type: str
    privilegeLevel: str
    highValue: bool
    betweenness: float
    pathTraversals: int
    criticalityScore: float


# ── Mitigations ──────────────────────────────────────────────────────────────
class MitigationSuggestion(BaseModel):
    priority: str     # Critical | High | Medium | Low
    category: str
    title: str
    detail: str


class MitigationsRequest(BaseModel):
    analysis: AnalysisRequest


# ── Export ───────────────────────────────────────────────────────────────────
class ExportRequest(BaseModel):
    analysis: AnalysisRequest


# ── MITRE ATT&CK ─────────────────────────────────────────────────────────────
class MITRETechnique(BaseModel):
    techniqueId: str
    subTechniqueId: Optional[str] = None
    name: str
    tactic: str
    tacticId: str
    severity: str
    usageCount: int
    relations: list[str]
    pathIds: list[str]


# ── Report ────────────────────────────────────────────────────────────────────
class ReportRequest(BaseModel):
    analysis: AnalysisRequest
    format: str = "markdown"   # "markdown" | "json"


# ── Defense ROI ──────────────────────────────────────────────────────────────
class ROIItem(BaseModel):
    edgeId: str
    source: str
    target: str
    relation: str
    pathsEliminated: int
    riskReductionPercent: float
    riskReductionAbsolute: float
    percentOfPaths: float
    fixComplexity: str          # Low | Medium | High
    estimatedDays: int
    roiScore: float             # higher = better investment priority


# ── Threat Intelligence ───────────────────────────────────────────────────────
class CVEEntry(BaseModel):
    cveId: str
    severity: str
    cvssScore: float
    description: str
    affectedSoftware: str
    exploitAvailable: bool
    patchAvailable: bool
    publishedDate: str


class NodeThreatIntel(BaseModel):
    nodeName: str
    cves: list[CVEEntry]
    totalCVEs: int
    criticalCount: int
    highCount: int
    exploitableCount: int
    riskBoost: float
    lastUpdated: str
    category: str
    nodeType: str


# ── What-If Timeline ─────────────────────────────────────────────────────────
class TimelinePoint(BaseModel):
    label: str
    description: str
    globalRisk: float
    totalPaths: int
    riskReductionPercent: float
    mitigationsApplied: list[str]
