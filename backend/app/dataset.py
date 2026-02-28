"""
Attack Path Forecaster — Dataset loader

Loads the active dataset from a JSON file.
Ships with a bundled default dataset; can be hot-swapped at runtime
via the /upload-dataset endpoint.
"""

from __future__ import annotations

import json
import copy
from pathlib import Path

# ── Default weight table (used when edges don't carry their own weight) ──
DEFAULT_WEIGHTS = {
    "MemberOf": 3, "CanRDP": 5, "HasSession": 6,
    "AdminTo": 7, "WriteDACL": 8, "GenericAll": 9,
    "Owns": 8, "ForceChangePassword": 7,
    "ReadLAPSPassword": 8, "AllExtendedRights": 9,
    "DCSync": 10,
}

# Path to the bundled default dataset
_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_DEFAULT_JSON = _DATA_DIR / "default_dataset.json"


def _load_json(path: Path) -> dict:
    """Read and parse a dataset JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _materialise(raw: dict) -> dict:
    """
    Convert a raw JSON dict into the runtime structures:
    NODES, EDGES (with computed weights), SUBNETS, WEIGHTS,
    CRITICAL_EDGE_ID, START_OPTIONS, SCENARIO_PRESETS.
    """
    weights = raw.get("weights", DEFAULT_WEIGHTS)

    subnets = raw.get("subnets", [])

    nodes = []
    for n in raw["nodes"]:
        nodes.append({
            "id": n["id"],
            "name": n["name"],
            "type": n["type"],
            "privilegeLevel": n.get("privilegeLevel", ""),
            "highValue": n.get("highValue", False),
            "subnet": n.get("subnet", ""),
        })

    edges = []
    for e in raw["edges"]:
        edges.append({
            "id": e["id"],
            "source": e["source"],
            "target": e["target"],
            "relation": e["relation"],
            "weight": e.get("weight", weights.get(e["relation"], 5)),
        })

    critical_edge_id = raw.get("criticalEdgeId", "")
    start_options = raw.get("startOptions", [])
    scenario_presets = raw.get("scenarioPresets", {})

    return {
        "WEIGHTS": weights,
        "SUBNETS": subnets,
        "NODES": nodes,
        "EDGES": edges,
        "CRITICAL_EDGE_ID": critical_edge_id,
        "START_OPTIONS": start_options,
        "SCENARIO_PRESETS": scenario_presets,
    }


def _init_empty() -> dict:
    """Return an empty dataset (app starts blank until user uploads)."""
    return {
        "WEIGHTS": dict(DEFAULT_WEIGHTS),
        "SUBNETS": [],
        "NODES": [],
        "EDGES": [],
        "CRITICAL_EDGE_ID": "",
        "START_OPTIONS": [],
        "SCENARIO_PRESETS": {},
    }


def _init_default() -> dict:
    """Load the bundled default dataset."""
    raw = _load_json(_DEFAULT_JSON)
    return _materialise(raw)


# ── Module-level "active" dataset (starts EMPTY — upload required) ─────
_active = _init_empty()

# Convenient module-level aliases (these are the objects other modules import)
WEIGHTS: dict          = _active["WEIGHTS"]
SUBNETS: list          = _active["SUBNETS"]
NODES: list            = _active["NODES"]
EDGES: list            = _active["EDGES"]
CRITICAL_EDGE_ID: str  = _active["CRITICAL_EDGE_ID"]
START_OPTIONS: list    = _active["START_OPTIONS"]
SCENARIO_PRESETS: dict = _active["SCENARIO_PRESETS"]


def is_loaded() -> bool:
    """Return True if a dataset has been uploaded."""
    return len(NODES) > 0


def reload_from_json(raw: dict) -> dict:
    """
    Hot-swap the active dataset from an already-parsed JSON dict.
    Returns a summary dict with node/edge counts.
    """
    global WEIGHTS, SUBNETS, NODES, EDGES, CRITICAL_EDGE_ID, START_OPTIONS, SCENARIO_PRESETS, _active

    data = _materialise(raw)
    _active = data

    WEIGHTS          = data["WEIGHTS"]
    SUBNETS          = data["SUBNETS"]
    NODES            = data["NODES"]
    EDGES            = data["EDGES"]
    CRITICAL_EDGE_ID = data["CRITICAL_EDGE_ID"]
    START_OPTIONS    = data["START_OPTIONS"]
    SCENARIO_PRESETS = data["SCENARIO_PRESETS"]

    return {
        "nodes": len(NODES),
        "edges": len(EDGES),
        "subnets": len(SUBNETS),
        "scenarios": len(SCENARIO_PRESETS),
        "startOptions": START_OPTIONS,
    }


def reset_to_default() -> dict:
    """Reset back to the bundled default dataset."""
    raw = _load_json(_DEFAULT_JSON)
    return reload_from_json(raw)


def validate_dataset(raw: dict) -> list[str]:
    """
    Validate an uploaded JSON dataset. Returns a list of error strings
    (empty means valid).
    """
    errors: list[str] = []

    if "nodes" not in raw:
        errors.append("Missing required field: 'nodes'")
    elif not isinstance(raw["nodes"], list) or len(raw["nodes"]) == 0:
        errors.append("'nodes' must be a non-empty array")
    else:
        for i, n in enumerate(raw["nodes"]):
            for field in ("id", "name", "type"):
                if field not in n:
                    errors.append(f"Node {i}: missing required field '{field}'")

    if "edges" not in raw:
        errors.append("Missing required field: 'edges'")
    elif not isinstance(raw["edges"], list) or len(raw["edges"]) == 0:
        errors.append("'edges' must be a non-empty array")
    else:
        for i, e in enumerate(raw["edges"]):
            for field in ("id", "source", "target", "relation"):
                if field not in e:
                    errors.append(f"Edge {i}: missing required field '{field}'")

    # Validate node name references in edges
    if not errors:
        node_names = {n["name"] for n in raw["nodes"]}
        for i, e in enumerate(raw["edges"]):
            if e.get("source") not in node_names:
                errors.append(f"Edge {i} ('{e.get('id')}'): source '{e.get('source')}' not found in nodes")
            if e.get("target") not in node_names:
                errors.append(f"Edge {i} ('{e.get('id')}'): target '{e.get('target')}' not found in nodes")

    return errors
