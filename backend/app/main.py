"""
Attack Path Forecaster — FastAPI application
Endpoints: /graph, /analyze, /explain, /simulate, /scenarios,
           /upload-dataset, /reset-dataset, /dataset-info,
           /critical-nodes, /mitigations, /export, /report,
           /roi-calculator, /timeline
"""

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"

from .models import (
    AnalysisRequest, AnalysisResponse,
    GraphResponse,
    SimulateRequest, SimulateResponse,
    AnalysisSummary, DeltaInfo,
    NeighborRequest, NeighborResponse,
    CriticalNode, MitigationSuggestion,
    MitigationsRequest, ExportRequest,
    ReportRequest, ROIItem, TimelinePoint,
)
from . import dataset as ds
from .graph_engine import GraphEngine
from .explainer import explain_path
from . import report_generator as report_gen

app = FastAPI(title="Attack Path Forecaster", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _rebuild_engine() -> GraphEngine:
    """Create a fresh GraphEngine from the current active dataset."""
    return GraphEngine(nodes=None, edges=None)


# Baseline graph engine (rebuilt when dataset changes)
engine: GraphEngine = _rebuild_engine()


def _require_dataset():
    """Raise 409 if no dataset has been uploaded yet."""
    if not ds.is_loaded():
        raise HTTPException(409, "No dataset loaded. Please upload a JSON dataset first.")

# Cache last analysis for /explain lookups
_last_analysis: dict[str, dict] = {}


# Endpoints

@app.get("/graph", response_model=GraphResponse)
def get_graph():
    """Return full node + edge lists for graph rendering."""
    _require_dataset()
    return {"nodes": ds.NODES, "edges": ds.EDGES}


@app.get("/subnets")
def get_subnets():
    """Return subnet definitions."""
    return ds.SUBNETS


@app.get("/start-options")
def get_start_options():
    """Return available start node options."""
    return ds.START_OPTIONS


@app.post("/neighbors", response_model=NeighborResponse)
def get_neighbors(req: NeighborRequest):
    """Return nodes/edges within N hops of a given node."""
    result = engine.get_neighbors(req.nodeName, req.radius)
    return result


@app.post("/analyze", response_model=AnalysisResponse)
def analyze(req: AnalysisRequest):
    """Run bounded attack-path analysis and return ranked results."""
    global _last_analysis
    result = engine.analyze(
        req.startNodes, req.targetNode,
        req.minDepth, req.maxDepth, req.k,
    )
    _last_analysis = {p["pathId"]: p for p in result["paths"]}
    return result


@app.get("/explain")
def explain(pathId: str = Query(..., description="Path ID from /analyze")):
    """Return step-by-step explanation for a discovered attack path."""
    if pathId not in _last_analysis:
        raise HTTPException(404, f"Path '{pathId}' not found. Run /analyze first.")
    return {"pathId": pathId, "explanation": explain_path(_last_analysis[pathId])}


@app.post("/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest):
    """Apply mutations, re-analyze, and return before/after comparison."""
    # Before (baseline)
    before = engine.analyze(
        req.analysis.startNodes, req.analysis.targetNode,
        req.analysis.minDepth, req.analysis.maxDepth, req.analysis.k,
    )

    # Clone and mutate
    mutated = engine.clone()
    for m in req.mutations:
        if m.type == "removeEdge" and m.edgeId:
            mutated.remove_edge(m.edgeId)
        elif m.type == "removeNode" and m.nodeId:
            mutated.remove_node_full(m.nodeId)
        elif m.type == "addEdge" and m.source and m.target and m.relation:
            mutated.add_edge(m.source, m.target, m.relation, m.weight or 5)

    after = mutated.analyze(
        req.analysis.startNodes, req.analysis.targetNode,
        req.analysis.minDepth, req.analysis.maxDepth, req.analysis.k,
    )

    # Delta
    before_tuples = {tuple(p["nodes"]) for p in before["paths"]}
    after_tuples = {tuple(p["nodes"]) for p in after["paths"]}
    eliminated = before_tuples - after_tuples

    br = before["globalRisk"]
    ar = after["globalRisk"]
    if br > 0:
        reduction = round((br - ar) / br * 100, 1)
    elif ar > 0:
        reduction = round(-ar / max(ar, 1) * 100, 1)
    else:
        reduction = 0.0

    hv_names = {n["name"] for n in ds.NODES if n.get("highValue")}
    before_hvt = len({n for p in before["paths"] for n in p["nodes"] if n in hv_names})
    after_hvt = len({n for p in after["paths"] for n in p["nodes"] if n in hv_names})

    return SimulateResponse(
        before=AnalysisSummary(
            totalPaths=before["totalPaths"],
            globalRisk=before["globalRisk"],
            shortestHops=before["shortestHops"],
            highValueTargetsReachable=before_hvt,
            pathIds=[p["pathId"] for p in before["paths"]],
        ),
        after=AnalysisSummary(
            totalPaths=after["totalPaths"],
            globalRisk=after["globalRisk"],
            shortestHops=after["shortestHops"],
            highValueTargetsReachable=after_hvt,
            pathIds=[p["pathId"] for p in after["paths"]],
        ),
        delta=DeltaInfo(
            pathReduction=before["totalPaths"] - after["totalPaths"],
            riskReductionPercent=reduction,
            eliminatedPaths=len(eliminated),
        ),
    )


@app.get("/scenarios")
def get_scenarios():
    """Return pre-built scenario definitions (A / B / C)."""
    return ds.SCENARIO_PRESETS


# Dataset management endpoints

@app.post("/upload-dataset")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Upload a JSON or SharpHound ZIP dataset to replace the active graph.
    Accepts:
      - Native app JSON (nodes/edges format)
      - Single-type AD export JSON (users.json, groups.json, etc.)
      - SharpHound ZIP export (contains multiple per-type JSON files)
    """
    global engine, _last_analysis

    try:
        content = await file.read()
    except Exception as exc:
        raise HTTPException(400, f"Could not read file: {exc}")

    # Detect and parse
    try:
        if ds.is_sharphound_zip(content):
            raw = ds.convert_sharphound_zip(content)
        else:
            raw = json.loads(content)
            if ds.is_ad_export_json(raw):
                raw = ds.convert_ad_export_json(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(400, f"Invalid JSON: {exc}")
    except Exception as exc:
        raise HTTPException(400, f"Could not parse file: {exc}")

    # Validate (skip for converted data — already normalised)
    errors = ds.validate_dataset(raw)
    if errors:
        raise HTTPException(422, detail={"validationErrors": errors})

    # Auto-convert GOAD format if detected
    if ds.is_goad_format(raw):
        raw = ds.convert_goad(raw)

    # Swap
    summary = ds.reload_from_json(raw)
    engine = _rebuild_engine()
    _last_analysis = {}

    return {"status": "ok", "message": "Dataset loaded successfully", **summary}


@app.post("/reset-dataset")
def reset_dataset():
    """Reset to the bundled default dataset."""
    global engine, _last_analysis

    summary = ds.reset_to_default()
    engine = _rebuild_engine()
    _last_analysis = {}

    return {"status": "ok", "message": "Reset to default dataset", **summary}


@app.get("/dataset-info")
def dataset_info():
    """Return metadata about the currently loaded dataset."""
    return {
        "nodes": len(ds.NODES),
        "edges": len(ds.EDGES),
        "subnets": len(ds.SUBNETS),
        "scenarios": len(ds.SCENARIO_PRESETS),
        "startOptions": ds.START_OPTIONS,
    }


@app.get("/sample-datasets")
def list_sample_datasets():
    """List available sample JSON datasets."""
    return [
        p.name for p in _DATA_DIR.glob("*.json")
        if p.name != "default_dataset.json"
    ]


@app.get("/sample-datasets/{filename}")
def download_sample_dataset(filename: str):
    """Download a sample dataset JSON file."""
    path = (_DATA_DIR / filename).resolve()
    if not str(path).startswith(str(_DATA_DIR)) or not path.exists():
        raise HTTPException(404, "Dataset not found")
    return FileResponse(path, media_type="application/json", filename=filename)


# Advanced analytics endpoints

@app.post("/critical-nodes", response_model=list[CriticalNode])
def critical_nodes(req: AnalysisRequest):
    """
    Return nodes ranked by betweenness centrality + path traversal frequency.
    Identifies chokepoints whose removal would most reduce attack surface.
    """
    _require_dataset()
    result = engine.analyze(
        req.startNodes, req.targetNode,
        req.minDepth, req.maxDepth, req.k,
    )
    nodes = engine.compute_critical_nodes(result["paths"])
    return nodes


@app.post("/mitigations", response_model=list[MitigationSuggestion])
def mitigations(req: AnalysisRequest):
    """
    Run analysis and return rule-based mitigation suggestions ranked by priority.
    """
    _require_dataset()
    result = engine.analyze(
        req.startNodes, req.targetNode,
        req.minDepth, req.maxDepth, req.k,
    )
    suggestions = engine.generate_mitigations(result["paths"], result["criticalEdges"])
    return suggestions


@app.post("/export")
def export_analysis(req: AnalysisRequest):
    """
    Run analysis and return a structured JSON report suitable for download.
    Includes all paths, risk scores, critical edges, mitigations, and metadata.
    """
    _require_dataset()
    result = engine.analyze(
        req.startNodes, req.targetNode,
        req.minDepth, req.maxDepth, req.k,
    )
    mitigations_list = engine.generate_mitigations(result["paths"], result["criticalEdges"])
    critical_nodes_list = engine.compute_critical_nodes(result["paths"])

    return {
        "reportVersion": "2.0",
        "generatedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "dataset": {
            "nodes": len(ds.NODES),
            "edges": len(ds.EDGES),
            "subnets": len(ds.SUBNETS),
        },
        "analysisParams": {
            "startNodes": req.startNodes,
            "targetNode": req.targetNode,
            "minDepth": req.minDepth,
            "maxDepth": req.maxDepth,
        },
        "summary": {
            "totalPaths": result["totalPaths"],
            "globalRisk": result["globalRisk"],
            "shortestHops": result["shortestHops"],
        },
        "top5Paths": result["top5"],
        "criticalEdges": result["criticalEdges"],
        "criticalNodes": critical_nodes_list,
        "mitigations": mitigations_list,
        "allPaths": result["paths"],
    }


# Auto Report Generator

@app.post("/report")
def generate_report(req: ReportRequest):
    """
    Generate a full Markdown or structured JSON report.
    Includes executive summary, technical findings, MITRE matrix, risk heatmap,
    and a prioritized remediation roadmap.
    """
    _require_dataset()
    result = engine.analyze(
        req.analysis.startNodes, req.analysis.targetNode,
        req.analysis.minDepth, req.analysis.maxDepth, req.analysis.k,
    )
    mitigations_list = engine.generate_mitigations(result["paths"], result["criticalEdges"])
    dataset_info = {
        "nodes": len(ds.NODES),
        "edges": len(ds.EDGES),
        "subnets": len(ds.SUBNETS),
    }
    params = {
        "startNodes": req.analysis.startNodes,
        "targetNode": req.analysis.targetNode,
        "minDepth": req.analysis.minDepth,
        "maxDepth": req.analysis.maxDepth,
    }

    if req.format == "json":
        return {
            "globalRisk": result["globalRisk"],
            "totalPaths": result["totalPaths"],
            "top5": result["top5"],
            "criticalEdges": result["criticalEdges"],
            "mitigations": mitigations_list,
            "datasetInfo": dataset_info,
            "params": params,
        }

    markdown = report_gen.generate_full_report(result, mitigations_list, params, dataset_info)
    return {
        "markdown": markdown,
        "generatedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "globalRisk": result["globalRisk"],
        "totalPaths": result["totalPaths"],
    }


# Defense ROI Calculator

@app.post("/roi-calculator", response_model=list[ROIItem])
def roi_calculator(req: AnalysisRequest):
    """
    For each critical edge, simulate its removal and calculate:
    paths eliminated, risk reduction percentage, fix complexity, and ROI score.
    Returns items sorted by ROI score (best investment first).
    """
    _require_dataset()
    result = engine.analyze(
        req.startNodes, req.targetNode,
        req.minDepth, req.maxDepth, req.k,
    )
    return engine.compute_defense_roi(result)


# What-If Time Machine

@app.post("/timeline", response_model=list[TimelinePoint])
def what_if_timeline(req: AnalysisRequest):
    """
    Progressive simulation showing risk reduction as mitigations are applied over time.
    Returns a series of timeline points (Now → After patches → Full remediation).
    """
    _require_dataset()
    result = engine.analyze(
        req.startNodes, req.targetNode,
        req.minDepth, req.maxDepth, req.k,
    )
    mitigations_list = engine.generate_mitigations(result["paths"], result["criticalEdges"])
    timeline = engine.compute_timeline(
        req.startNodes, req.targetNode,
        req.minDepth, req.maxDepth, req.k,
        mitigations_list,
    )
    return timeline
