"""
Core graph engine — builds a NetworkX MultiDiGraph, finds bounded attack
paths, computes risk scores & identifies critical edges.

Enhanced with:
- Privilege-aware risk scoring
- Critical asset multipliers
- Normalized scores & impact estimation
- Path depth limits / result caps for performance
"""

from __future__ import annotations

import copy
from math import sqrt, log2

import networkx as nx

from . import dataset as ds

# ── Privilege level weights (higher = more valuable to attacker) ────────────
PRIV_WEIGHT = {
    "Low": 1.0,
    "Mid-Low": 1.5,
    "Mid": 2.0,
    "Mid-High": 3.0,
    "Service": 3.5,
    "Domain Admin": 5.0,
    "Domain Controller": 5.0,
    "": 1.0,
}

# High-value target multiplier
HV_MULTIPLIER = 2.0

# Maximum results cap
MAX_RESULTS_DEFAULT = 20


class GraphEngine:
    """Wraps a NetworkX MultiDiGraph with attack-path analysis helpers."""

    def __init__(self, nodes: list | None = None, edges: list | None = None):
        self.nodes = nodes if nodes is not None else copy.deepcopy(ds.NODES)
        self.edges = edges if edges is not None else copy.deepcopy(ds.EDGES)
        self.G = nx.MultiDiGraph()
        self._node_map: dict[str, dict] = {}
        self._build()

    # ── graph construction ──────────────────────────────────────────────────
    def _build(self):
        for n in self.nodes:
            self.G.add_node(n["name"], **n)
            self._node_map[n["name"]] = n
        for e in self.edges:
            self.G.add_edge(
                e["source"], e["target"], key=e["id"],
                id=e["id"], relation=e["relation"], weight=e["weight"],
            )

    def clone(self) -> GraphEngine:
        eng = GraphEngine.__new__(GraphEngine)
        eng.nodes = copy.deepcopy(self.nodes)
        eng.edges = copy.deepcopy(self.edges)
        eng.G = self.G.copy()
        eng._node_map = {n["name"]: n for n in eng.nodes}
        return eng

    # ── mutations ───────────────────────────────────────────────────────────
    def remove_edge(self, edge_id: str) -> bool:
        for u, v, k in list(self.G.edges(keys=True)):
            if k == edge_id:
                self.G.remove_edge(u, v, key=k)
                self.edges = [e for e in self.edges if e["id"] != edge_id]
                return True
        return False

    def remove_node_full(self, node_name: str) -> bool:
        if node_name in self.G:
            self.G.remove_node(node_name)
            self.nodes = [n for n in self.nodes if n["name"] != node_name]
            self.edges = [
                e for e in self.edges
                if e["source"] != node_name and e["target"] != node_name
            ]
            if node_name in self._node_map:
                del self._node_map[node_name]
            return True
        return False

    def add_edge(self, source: str, target: str, relation: str, weight: int = 5) -> str:
        """Add a new edge to the graph. Returns the new edge ID."""
        eid = f"SIM{len(self.edges) + 1:03d}"
        edge = {
            "id": eid, "source": source, "target": target,
            "relation": relation, "weight": weight,
        }
        self.edges.append(edge)
        self.G.add_edge(source, target, key=eid,
                        id=eid, relation=relation, weight=weight)
        return eid

    # ── enhanced risk scoring ───────────────────────────────────────────────
    def _compute_path_risk(self, path: list[str], edges_info: list[dict], sum_weights: int, hops: int) -> dict:
        """
        Compute enhanced risk score considering:
        - Edge weight sum
        - Node privilege levels along path
        - Path length penalty (shorter = riskier)
        - Critical asset multiplier
        - Critical edge bonus
        """
        # 1. Base edge risk
        edge_risk = sum_weights

        # 2. Node privilege escalation bonus
        priv_bonus = 0.0
        for node_name in path:
            node = self._node_map.get(node_name, {})
            priv_bonus += PRIV_WEIGHT.get(node.get("privilegeLevel", ""), 1.0)

        # 3. Path length penalty (shorter paths are more dangerous)
        length_penalty = 1.0 / sqrt(hops) if hops > 0 else 1.0

        # 4. Critical asset multiplier
        critical_mult = 1.0
        for node_name in path:
            node = self._node_map.get(node_name, {})
            if node.get("highValue", False):
                critical_mult = max(critical_mult, HV_MULTIPLIER)

        # 5. Critical edge bonus
        has_critical = any(e["edgeId"] == ds.CRITICAL_EDGE_ID for e in edges_info)
        critical_edge_bonus = 1.5 if has_critical else 1.0

        # Combined risk
        raw_risk = (edge_risk + priv_bonus) * length_penalty * critical_mult * critical_edge_bonus
        risk_score = round(raw_risk, 2)

        # Normalized score (0-100 scale, capped)
        normalized = min(100.0, round(risk_score / 1.5, 1))

        # Impact estimation
        if normalized >= 80:
            impact = "Critical"
        elif normalized >= 60:
            impact = "High"
        elif normalized >= 40:
            impact = "Medium"
        else:
            impact = "Low"

        return {
            "risk": risk_score,
            "normalizedScore": normalized,
            "impactEstimation": impact,
        }

    # ── path finding (bounded DFS via NetworkX) ─────────────────────────────
    def find_paths(
        self,
        start_nodes: list[str],
        target: str,
        min_depth: int = 4,
        max_depth: int = 7,
        k: int = MAX_RESULTS_DEFAULT,
    ) -> list[dict]:
        results: list[dict] = []
        for idx, start in enumerate(start_nodes):
            if start not in self.G or target not in self.G:
                continue
            chain = chr(65 + idx)  # A, B, C, D …
            count = 0
            try:
                for path in nx.all_simple_paths(self.G, start, target, cutoff=max_depth):
                    hops = len(path) - 1
                    if hops < min_depth:
                        continue
                    count += 1
                    edges_info, edge_types, sw, crit = self._resolve_edges(path)

                    # Enhanced risk scoring
                    risk_data = self._compute_path_risk(path, edges_info, sw, hops)
                    critical_edges_in_path = [
                        e["edgeId"] for e in edges_info if e["edgeId"] == ds.CRITICAL_EDGE_ID
                    ]

                    results.append({
                        "pathId": f"{chain}{count}",
                        "nodes": list(path),
                        "edges": edges_info,
                        "hops": hops,
                        "edgeTypes": edge_types,
                        "sumWeights": sw,
                        "risk": risk_data["risk"],
                        "normalizedScore": risk_data["normalizedScore"],
                        "impactEstimation": risk_data["impactEstimation"],
                        "throughCritical": crit,
                        "criticalEdgesInPath": critical_edges_in_path,
                    })
                    if count >= k:
                        break
            except nx.NetworkXError:
                continue
        results.sort(key=lambda p: p["risk"], reverse=True)
        return results

    def _resolve_edges(self, path: list[str]):
        edges_info: list[dict] = []
        edge_types: list[str] = []
        sw = 0
        crit = False
        for j in range(len(path) - 1):
            u, v = path[j], path[j + 1]
            edge_data = self.G.get_edge_data(u, v)
            if not edge_data:
                continue
            best = max(edge_data.values(), key=lambda e: e.get("weight", 0))
            edges_info.append({
                "edgeId": best["id"], "source": u, "target": v,
                "relation": best["relation"], "weight": best["weight"],
            })
            edge_types.append(best["relation"])
            sw += best["weight"]
            if best["id"] == ds.CRITICAL_EDGE_ID:
                crit = True
        return edges_info, edge_types, sw, crit

    # ── aggregation helpers ─────────────────────────────────────────────────
    def compute_critical_edges(self, paths: list[dict]) -> list[dict]:
        total = len(paths)
        if total == 0:
            return []
        counts: dict[str, dict] = {}
        for p in paths:
            for e in p["edges"]:
                eid = e["edgeId"]
                if eid not in counts:
                    counts[eid] = {
                        "edgeId": eid, "source": e["source"],
                        "relation": e["relation"], "target": e["target"],
                        "traversalCount": 0,
                    }
                counts[eid]["traversalCount"] += 1
        for c in counts.values():
            c["percentOfPaths"] = round(c["traversalCount"] / total * 100, 1)
        return sorted(counts.values(), key=lambda x: x["traversalCount"], reverse=True)

    @staticmethod
    def global_risk(paths: list[dict]) -> float:
        return round(sum(p["risk"] for p in paths), 2)

    # ── neighbor finding for focus mode ─────────────────────────────────────
    def get_neighbors(self, node_name: str, radius: int = 2) -> dict:
        """Return nodes and edges within `radius` hops of node_name."""
        if node_name not in self.G:
            return {"nodes": [], "edges": []}

        # BFS to find reachable nodes within radius (both directions)
        visited = {node_name}
        frontier = {node_name}
        for _ in range(radius):
            next_frontier = set()
            for n in frontier:
                # Successors
                for succ in self.G.successors(n):
                    if succ not in visited:
                        visited.add(succ)
                        next_frontier.add(succ)
                # Predecessors
                for pred in self.G.predecessors(n):
                    if pred not in visited:
                        visited.add(pred)
                        next_frontier.add(pred)
            frontier = next_frontier

        # Collect relevant edges
        relevant_edges = []
        for e in self.edges:
            if e["source"] in visited and e["target"] in visited:
                relevant_edges.append(e)

        relevant_nodes = [n for n in self.nodes if n["name"] in visited]
        return {"nodes": relevant_nodes, "edges": relevant_edges}

    # ── combined analysis ───────────────────────────────────────────────────
    def analyze(
        self, start_nodes, target, min_depth=4, max_depth=7, k=MAX_RESULTS_DEFAULT,
    ) -> dict:
        paths = self.find_paths(start_nodes, target, min_depth, max_depth, k)
        crit = self.compute_critical_edges(paths)
        gr = self.global_risk(paths)
        shortest = min((p["hops"] for p in paths), default=0)
        return {
            "totalPaths": len(paths),
            "paths": paths,
            "top5": paths[:5],
            "shortestHops": shortest,
            "criticalEdges": crit[:10],
            "globalRisk": gr,
        }
