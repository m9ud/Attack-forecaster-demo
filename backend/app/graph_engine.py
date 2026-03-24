"""
Core graph engine — builds a NetworkX MultiDiGraph, finds bounded attack
paths, computes multi-factor risk scores & identifies critical edges/nodes.

Risk Formula:
  risk = (Σ edge_weights + Σ priv_bonuses)
         × (1 / √hops)
         × critical_mult
         × critical_edge_bonus
         × exploit_ease_factor
         × stealth_factor

- exploit_ease_factor : how easy the relations are to exploit (1.0 = trivial)
- stealth_factor      : how hard the path is to detect (1.0 = invisible)
"""

from __future__ import annotations

import copy
from math import sqrt

import networkx as nx

from . import dataset as ds

# ── Privilege level weights ─────────────────────────────────────────────────
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

HV_MULTIPLIER = 2.0
MAX_RESULTS_DEFAULT = 20

# ── Multi-factor: Exploit Ease (1.0 = trivial, 0.6 = needs specialist tools) ─
EXPLOIT_EASE: dict[str, float] = {
    "MemberOf": 1.00,
    "GenericAll": 0.95,
    "ForceChangePassword": 0.95,
    "AddSelf": 0.90,
    "AddMember": 0.90,
    "HasSession": 0.85,
    "AdminTo": 0.85,
    "AllExtendedRights": 0.85,
    "Owns": 0.85,
    "ReadLAPSPassword": 0.80,
    "SQLAdmin": 0.80,
    "CanRDP": 0.80,
    "WriteDACL": 0.75,
    "GenericWrite": 0.75,
    "DCSync": 0.75,
    "WriteOwner": 0.70,
}

# ── Multi-factor: Stealth (1.0 = invisible, 0.4 = very noisy / triggers alerts) ─
STEALTH: dict[str, float] = {
    "MemberOf": 1.00,
    "ReadLAPSPassword": 0.85,
    "Owns": 0.80,
    "GenericAll": 0.80,
    "GenericWrite": 0.75,
    "AddSelf": 0.75,
    "AddMember": 0.75,
    "AllExtendedRights": 0.75,
    "WriteOwner": 0.70,
    "WriteDACL": 0.70,
    "ForceChangePassword": 0.65,
    "CanRDP": 0.60,
    "SQLAdmin": 0.60,
    "HasSession": 0.55,
    "AdminTo": 0.55,
    "DCSync": 0.45,
}


def _avg_factor(relations: list[str], table: dict[str, float], default: float = 0.80) -> float:
    vals = [table.get(r, default) for r in relations]
    return sum(vals) / len(vals) if vals else default


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
        eid = f"SIM{len(self.edges) + 1:03d}"
        edge = {"id": eid, "source": source, "target": target, "relation": relation, "weight": weight}
        self.edges.append(edge)
        self.G.add_edge(source, target, key=eid, id=eid, relation=relation, weight=weight)
        return eid

    # ── multi-factor risk scoring ───────────────────────────────────────────
    def _compute_path_risk(
        self, path: list[str], edges_info: list[dict], sum_weights: int, hops: int
    ) -> dict:
        """
        Multi-factor risk score:
          risk = (edge_risk + priv_bonus)
                 × length_penalty
                 × critical_mult
                 × critical_edge_bonus
                 × exploit_ease_factor
                 × stealth_factor
        """
        # 1. Base edge risk
        edge_risk = sum_weights

        # 2. Privilege escalation bonus across all nodes on path
        priv_bonus = sum(
            PRIV_WEIGHT.get(self._node_map.get(n, {}).get("privilegeLevel", ""), 1.0)
            for n in path
        )

        # 3. Shorter paths are more dangerous
        length_penalty = 1.0 / sqrt(hops) if hops > 0 else 1.0

        # 4. High-value target multiplier
        critical_mult = HV_MULTIPLIER if any(
            self._node_map.get(n, {}).get("highValue", False) for n in path
        ) else 1.0

        # 5. Dataset-designated critical edge bonus
        has_critical = any(e["edgeId"] == ds.CRITICAL_EDGE_ID for e in edges_info)
        critical_edge_bonus = 1.5 if has_critical else 1.0

        # 6. Multi-factor: exploit ease (0.70–1.00)
        relations = [e["relation"] for e in edges_info]
        exploit_ease = _avg_factor(relations, EXPLOIT_EASE)

        # 7. Multi-factor: stealth (0.45–1.00)
        stealth = _avg_factor(relations, STEALTH)

        raw_risk = (
            (edge_risk + priv_bonus)
            * length_penalty
            * critical_mult
            * critical_edge_bonus
            * exploit_ease
            * stealth
        )
        risk_score = round(raw_risk, 2)

        # Normalized 0–100 (cap at 100)
        normalized = min(100.0, round(risk_score / 1.2, 1))

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
            "exploitEase": round(exploit_ease, 3),
            "stealthFactor": round(stealth, 3),
        }

    # ── path finding ────────────────────────────────────────────────────────
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
            chain = chr(65 + idx)
            count = 0
            try:
                for path in nx.all_simple_paths(self.G, start, target, cutoff=max_depth):
                    hops = len(path) - 1
                    if hops < min_depth:
                        continue
                    count += 1
                    edges_info, edge_types, sw, crit = self._resolve_edges(path)
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
                        "exploitEase": risk_data["exploitEase"],
                        "stealthFactor": risk_data["stealthFactor"],
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

    # ── critical edge aggregation ───────────────────────────────────────────
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

    # ── critical node identification (betweenness centrality) ───────────────
    def compute_critical_nodes(self, paths: list[dict] | None = None) -> list[dict]:
        """
        Rank nodes by betweenness centrality on the full graph.
        Also reports how many discovered attack paths pass through each node.
        Returns top 10 nodes sorted by centrality (descending).
        """
        if len(self.G.nodes) == 0:
            return []

        # Betweenness centrality (normalized 0–1)
        try:
            centrality = nx.betweenness_centrality(self.G, normalized=True, weight=None)
        except Exception:
            centrality = {}

        # Count path traversals per node from our attack paths
        path_counts: dict[str, int] = {}
        if paths:
            for p in paths:
                for node_name in p["nodes"]:
                    path_counts[node_name] = path_counts.get(node_name, 0) + 1

        results = []
        for node_name, bc in centrality.items():
            node_info = self._node_map.get(node_name, {})
            results.append({
                "name": node_name,
                "type": node_info.get("type", ""),
                "privilegeLevel": node_info.get("privilegeLevel", ""),
                "highValue": node_info.get("highValue", False),
                "betweenness": round(bc, 4),
                "pathTraversals": path_counts.get(node_name, 0),
                "criticalityScore": round(bc * 100 + path_counts.get(node_name, 0) * 0.5, 2),
            })

        results.sort(key=lambda x: x["criticalityScore"], reverse=True)
        return results[:15]

    # ── rule-based mitigation suggestions ──────────────────────────────────
    def generate_mitigations(self, paths: list[dict], critical_edges: list[dict]) -> list[dict]:
        """
        Generate rule-based mitigation suggestions from analysis results.
        Priority is assigned based on: path coverage, relation severity, node privilege.
        """
        mitigations: list[dict] = []
        seen: set[str] = set()

        def _add(priority: str, category: str, title: str, detail: str, key: str):
            if key not in seen:
                seen.add(key)
                mitigations.append({
                    "priority": priority,
                    "category": category,
                    "title": title,
                    "detail": detail,
                })

        # Rule 1 — critical edges (top bottlenecks)
        for ce in critical_edges[:5]:
            rel = ce["relation"]
            src = ce["source"]
            tgt = ce["target"]
            pct = ce["percentOfPaths"]

            if rel == "DCSync":
                _add("Critical", "Privilege Reduction",
                     f"Revoke DCSync rights: {src} → {tgt}",
                     f"This edge appears in {pct}% of all attack paths. "
                     "DCSync allows full credential dump of the domain. "
                     "Remove replication rights from non-DC accounts immediately.",
                     f"dcsync_{src}")
            elif rel == "GenericAll":
                _add("Critical", "ACL Hardening",
                     f"Remove GenericAll: {src} → {tgt}",
                     f"GenericAll grants full control and appears in {pct}% of paths. "
                     "Audit and remove this permission; use least-privilege ACEs instead.",
                     f"genericall_{src}_{tgt}")
            elif rel in ("WriteDACL", "WriteOwner", "GenericWrite"):
                _add("High", "ACL Hardening",
                     f"Restrict {rel}: {src} → {tgt}",
                     f"This write permission appears in {pct}% of attack paths and enables "
                     "ACL manipulation. Restrict to Domain Admins only.",
                     f"{rel.lower()}_{src}_{tgt}")
            elif rel == "ForceChangePassword":
                _add("High", "Account Protection",
                     f"Remove ForceChangePassword: {src} → {tgt}",
                     f"Allows account takeover without knowing the original password. "
                     f"Appears in {pct}% of paths. Restrict this right to helpdesk staff only.",
                     f"fcp_{src}_{tgt}")
            elif rel == "AdminTo":
                _add("High", "Privilege Reduction",
                     f"Audit local admin: {src} → {tgt}",
                     f"Local administrator access appears in {pct}% of paths. "
                     "Implement LAPS and restrict local admin rights.",
                     f"adminto_{src}_{tgt}")
            elif rel == "HasSession":
                _add("Medium", "Credential Protection",
                     f"Protect session on {tgt}",
                     f"Active sessions allow credential extraction via memory dumping. "
                     "Enable Credential Guard and Protected Users group.",
                     f"session_{src}_{tgt}")
            elif rel == "MemberOf":
                _add("Medium", "Group Membership Audit",
                     f"Audit group membership: {src} → {tgt}",
                     f"Group membership chain in {pct}% of paths. "
                     "Review whether {src} requires membership in {tgt}.",
                     f"memberof_{src}_{tgt}")

        # Rule 2 — nodes with Domain Controller privilege
        dc_nodes = [n for n in self.nodes if n.get("privilegeLevel") == "Domain Controller"]
        for dc in dc_nodes:
            _add("Critical", "Network Segmentation",
                 f"Isolate Domain Controller: {dc['name']}",
                 "Restrict network access to the DC. Only Domain Admins and "
                 "specific services should communicate directly with the DC. "
                 "Consider Tier 0 isolation model.",
                 f"isolate_dc_{dc['name']}")

        # Rule 3 — high-value non-DC nodes
        hv_nodes = [n for n in self.nodes if n.get("highValue") and n.get("privilegeLevel") != "Domain Controller"]
        for hv in hv_nodes[:3]:
            _add("High", "Account Monitoring",
                 f"Monitor high-value account: {hv['name']}",
                 f"{hv['name']} is marked as a high-value target. "
                 "Enable advanced auditing, alert on logon events, and review its "
                 "outgoing permissions.",
                 f"monitor_hv_{hv['name']}")

        # Rule 4 — general recommendations based on path count
        if len(paths) > 10:
            _add("High", "Network Segmentation",
                 "Implement network segmentation / firewall rules",
                 f"{len(paths)} attack paths were found. Network segmentation between "
                 "CIS and DCS subnets would break lateral movement chains. "
                 "Deploy internal firewalls between subnet zones.",
                 "network_seg")

        if any(p.get("stealthFactor", 1.0) > 0.8 for p in paths):
            _add("Medium", "Detection Engineering",
                 "Improve detection coverage for stealthy paths",
                 "Some attack paths have high stealth scores, meaning they generate "
                 "minimal log events. Enable advanced AD auditing (4662, 4670, 4728) "
                 "and deploy a SIEM with AD-specific rules.",
                 "detection_stealthy")

        if any("DCSync" in p["edgeTypes"] for p in paths):
            _add("Critical", "Monitoring",
                 "Alert on DCSync / replication requests",
                 "Monitor for unexpected MS-DRSR replication calls (event 4662 with "
                 "GUID 1131f6ad). This is a strong indicator of credential dumping.",
                 "alert_dcsync")

        # Sort: Critical → High → Medium → Low
        order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
        mitigations.sort(key=lambda m: order.get(m["priority"], 4))
        return mitigations

    # ── neighbor finding ────────────────────────────────────────────────────
    def get_neighbors(self, node_name: str, radius: int = 2) -> dict:
        if node_name not in self.G:
            return {"nodes": [], "edges": []}
        visited = {node_name}
        frontier = {node_name}
        for _ in range(radius):
            next_frontier = set()
            for n in frontier:
                for succ in self.G.successors(n):
                    if succ not in visited:
                        visited.add(succ)
                        next_frontier.add(succ)
                for pred in self.G.predecessors(n):
                    if pred not in visited:
                        visited.add(pred)
                        next_frontier.add(pred)
            frontier = next_frontier
        relevant_edges = [e for e in self.edges if e["source"] in visited and e["target"] in visited]
        return {"nodes": [n for n in self.nodes if n["name"] in visited], "edges": relevant_edges}

    # ── Defense ROI calculator ───────────────────────────────────────────────
    def compute_defense_roi(self, result: dict) -> list[dict]:
        """
        For each critical edge, simulate its removal and compute ROI metrics:
        paths eliminated, risk reduction, and an ROI score to prioritize fixes.
        """
        paths = result["paths"]
        critical_edges = result["criticalEdges"]
        base_risk = result["globalRisk"]
        total_paths = result["totalPaths"]
        if not paths or not critical_edges:
            return []

        # Fix complexity / effort by relation type
        FIX_COMPLEXITY: dict[str, tuple[str, int]] = {
            "DCSync": ("High", 14),
            "WriteDACL": ("High", 14),
            "WriteOwner": ("High", 14),
            "GenericAll": ("High", 21),
            "AdminTo": ("Medium", 7),
            "CanRDP": ("Medium", 7),
            "HasSession": ("Medium", 10),
            "GenericWrite": ("Medium", 10),
            "ForceChangePassword": ("Low", 3),
            "ReadLAPSPassword": ("Low", 5),
            "AllExtendedRights": ("Medium", 7),
            "AddSelf": ("Low", 3),
            "AddMember": ("Low", 3),
            "MemberOf": ("Low", 1),
            "Owns": ("High", 14),
            "SQLAdmin": ("Medium", 7),
        }

        roi_items: list[dict] = []
        analysis_params = {
            "start_nodes": list({n for p in paths for n in [p["nodes"][0]]}) if paths else [],
            "target": paths[0]["nodes"][-1] if paths else "",
            "min_depth": min(p["hops"] for p in paths) if paths else 1,
            "max_depth": max(p["hops"] for p in paths) if paths else 10,
            "k": len(paths),
        }

        for edge_info in critical_edges[:15]:
            edge_id = edge_info.get("edgeId", "")
            relation = edge_info.get("relation", "")

            # Simulate removal
            try:
                mutated = self.clone()
                mutated.remove_edge(edge_id)
                after = mutated.analyze(
                    analysis_params["start_nodes"],
                    analysis_params["target"],
                    analysis_params["min_depth"],
                    analysis_params["max_depth"],
                    analysis_params["k"],
                )
                after_risk = after["globalRisk"]
                after_paths = after["totalPaths"]
            except Exception:
                after_risk = base_risk
                after_paths = total_paths

            paths_eliminated = total_paths - after_paths
            risk_reduction_abs = base_risk - after_risk
            risk_reduction_pct = round(risk_reduction_abs / base_risk * 100, 1) if base_risk > 0 else 0.0

            complexity, est_days = FIX_COMPLEXITY.get(relation, ("Medium", 7))

            # ROI score: risk_reduction / complexity_weight
            complexity_weight = {"Low": 1.0, "Medium": 2.0, "High": 3.5}.get(complexity, 2.0)
            roi_score = round(risk_reduction_pct / complexity_weight, 2)

            roi_items.append({
                "edgeId": edge_id,
                "source": edge_info.get("source", ""),
                "target": edge_info.get("target", ""),
                "relation": relation,
                "pathsEliminated": paths_eliminated,
                "riskReductionPercent": risk_reduction_pct,
                "riskReductionAbsolute": round(risk_reduction_abs, 1),
                "percentOfPaths": edge_info.get("percentOfPaths", 0),
                "fixComplexity": complexity,
                "estimatedDays": est_days,
                "roiScore": roi_score,
            })

        # Sort by ROI score descending
        roi_items.sort(key=lambda x: x["roiScore"], reverse=True)
        return roi_items

    # ── What-If Timeline ─────────────────────────────────────────────────────
    def compute_timeline(
        self,
        start_nodes: list[str],
        target: str,
        min_depth: int,
        max_depth: int,
        k: int,
        mitigations: list[dict],
    ) -> list[dict]:
        """
        Progressive simulation of applying mitigations over time.
        Returns a list of timeline points showing risk reduction at each stage.
        """
        base = self.analyze(start_nodes, target, min_depth, max_depth, k)
        base_risk = base["globalRisk"]
        base_paths = base["totalPaths"]

        if base_risk == 0:
            return []

        stages = [
            {
                "label": "Current State",
                "description": "Baseline — no mitigations applied",
                "mitigationsApplied": [],
                "mutations": [],
            }
        ]

        # Build staged mitigation groups from the mitigations list
        critical_mits = [m for m in mitigations if m.get("priority") == "Critical"][:3]
        high_mits = [m for m in mitigations if m.get("priority") == "High"][:4]
        medium_mits = [m for m in mitigations if m.get("priority") == "Medium"][:4]
        if critical_mits:
            stages.append({
                "label": "After Critical Fixes",
                "description": f"Applied {len(critical_mits)} critical remediations (0–7 days)",
                "mitigationsApplied": [m.get("title", "") for m in critical_mits],
                "mutations": [],
            })
        if high_mits:
            stages.append({
                "label": "After High-Priority Fixes",
                "description": f"Applied {len(high_mits)} high-priority remediations (7–30 days)",
                "mitigationsApplied": [m.get("title", "") for m in high_mits],
                "mutations": [],
            })
        if medium_mits:
            stages.append({
                "label": "After Medium-Priority Fixes",
                "description": f"Applied {len(medium_mits)} medium-priority remediations (30–90 days)",
                "mitigationsApplied": [m.get("title", "") for m in medium_mits],
                "mutations": [],
            })
        stages.append({
            "label": "Full Remediation Plan",
            "description": "All identified mitigations applied (90–180 days)",
            "mitigationsApplied": ["Complete remediation plan executed"],
            "mutations": [],
        })

        # For each stage, estimate risk by progressively removing critical edges
        critical_edges = base.get("criticalEdges", [])
        mutated_engine = self.clone()
        timeline_points: list[dict] = []

        # Stage 0: baseline
        timeline_points.append({
            "label": stages[0]["label"],
            "description": stages[0]["description"],
            "globalRisk": round(base_risk, 1),
            "totalPaths": base_paths,
            "riskReductionPercent": 0.0,
            "mitigationsApplied": [],
        })

        edges_per_stage = max(1, len(critical_edges) // max(len(stages) - 1, 1))
        edge_cursor = 0

        for stage in stages[1:]:
            # Remove a batch of critical edges for this stage
            batch = critical_edges[edge_cursor: edge_cursor + edges_per_stage]
            for edge_info in batch:
                try:
                    mutated_engine.remove_edge(edge_info["edgeId"])
                except Exception:
                    pass
            edge_cursor += edges_per_stage

            try:
                after = mutated_engine.analyze(start_nodes, target, min_depth, max_depth, k)
                after_risk = after["globalRisk"]
                after_paths = after["totalPaths"]
            except Exception:
                after_risk = timeline_points[-1]["globalRisk"] * 0.7
                after_paths = max(0, timeline_points[-1]["totalPaths"] - 2)

            reduction_pct = round((base_risk - after_risk) / base_risk * 100, 1) if base_risk > 0 else 0.0
            timeline_points.append({
                "label": stage["label"],
                "description": stage["description"],
                "globalRisk": round(after_risk, 1),
                "totalPaths": after_paths,
                "riskReductionPercent": reduction_pct,
                "mitigationsApplied": stage["mitigationsApplied"],
            })

        return timeline_points

    # ── combined analysis ───────────────────────────────────────────────────
    def analyze(self, start_nodes, target, min_depth=4, max_depth=7, k=MAX_RESULTS_DEFAULT) -> dict:
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