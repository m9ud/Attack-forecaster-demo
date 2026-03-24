"""
Auto Report Generator — builds Executive + Technical Markdown reports.
"""

from __future__ import annotations
from datetime import datetime

from .mitre_mapping import EDGE_TO_MITRE, get_techniques_for_paths, TACTIC_NAMES


# ── Helpers ──────────────────────────────────────────────────────────────────

def _risk_bar(score: float, width: int = 10) -> str:
    filled = round(max(0.0, min(score, 100.0)) / 100 * width)
    return "█" * filled + "░" * (width - filled)


def _impact_prefix(impact: str) -> str:
    return {"Critical": "[!!!]", "High": "[!! ]", "Medium": "[ ! ]", "Low": "[   ]"}.get(impact, "[   ]")


# ── Sections ─────────────────────────────────────────────────────────────────

def generate_executive_summary(result: dict, dataset_info: dict, params: dict) -> str:
    global_risk = result.get("globalRisk", 0)
    total_paths = result.get("totalPaths", 0)
    top5 = result.get("top5", [])
    critical_edges = result.get("criticalEdges", [])

    if global_risk >= 800:
        risk_level, risk_color, risk_desc = (
            "CRITICAL", "red",
            "Immediate action required. Multiple high-severity attack paths have been identified."
        )
    elif global_risk >= 500:
        risk_level, risk_color, risk_desc = (
            "HIGH", "orange",
            "Significant vulnerabilities detected. Remediation should begin within 30 days."
        )
    elif global_risk >= 200:
        risk_level, risk_color, risk_desc = (
            "MEDIUM", "yellow",
            "Moderate risk profile. Address identified issues within 90 days."
        )
    else:
        risk_level, risk_color, risk_desc = (
            "LOW", "green",
            "Limited attack surface detected. Maintain current security posture."
        )

    critical_count = sum(1 for p in top5 if p.get("impactEstimation") == "Critical")
    high_count = sum(1 for p in top5 if p.get("impactEstimation") == "High")
    shortest = result.get("shortestHops", 0)

    lines = [
        "## Executive Summary",
        "",
        f"**Assessment Date:** {datetime.utcnow().strftime('%B %d, %Y')}  ",
        f"**Overall Risk Level:** **{risk_level}**  ",
        f"**Target:** `{params.get('targetNode', 'N/A')}`  ",
        f"**Scope:** {dataset_info.get('nodes', 0)} systems · {dataset_info.get('edges', 0)} connections",
        "",
        "---",
        "",
        f"> {risk_desc}",
        "",
        "### Key Metrics",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Overall Risk Score | **{global_risk:.0f}** / 1000 |",
        f"| Attack Paths Found | {total_paths} |",
        f"| Shortest Path (hops) | {shortest} |",
        f"| Critical Paths | {critical_count} |",
        f"| High-Severity Paths | {high_count} |",
        f"| Bottleneck Edges | {len(critical_edges)} |",
        "",
        "### Business Impact Statement",
        "",
        "An attacker successfully exploiting the identified paths could:",
        "",
        "- Obtain **Domain Administrator** privileges over the Active Directory environment",
        "- Exfiltrate all domain credentials via **DCSync** replication",
        "- Establish **persistent backdoors** that survive password resets",
        "- Access sensitive servers, databases, and crown-jewel systems",
        "",
        "### Priority Action Summary",
        "",
        f"1. **Immediate (0–7 days):** Remediate {len([e for e in critical_edges])} critical bottleneck edges identified in this report",
        "2. **Short-term (7–30 days):** Implement Privileged Access Management (PAM) and Tier-0 isolation",
        "3. **Medium-term (30–90 days):** Deploy enhanced detection and monitoring for lateral movement",
        "4. **Long-term (90+ days):** Achieve Zero Trust architecture across all AD tiers",
        "",
    ]
    return "\n".join(lines)


def generate_technical_findings(result: dict, params: dict) -> str:
    paths = result.get("paths", [])
    top5 = result.get("top5", [])
    critical_edges = result.get("criticalEdges", [])

    lines = [
        "## Technical Findings",
        "",
        f"**Start Nodes:** `{', '.join(params.get('startNodes', []))}`  ",
        f"**Target Node:** `{params.get('targetNode', 'N/A')}`  ",
        f"**Depth Range:** {params.get('minDepth', 1)}–{params.get('maxDepth', 10)} hops",
        "",
        "### Top Attack Paths",
        "",
    ]

    for i, path in enumerate(top5[:5], 1):
        impact = path.get("impactEstimation", "Low")
        risk = path.get("risk", 0)
        nodes = path.get("nodes", [])
        edge_types = path.get("edgeTypes", [])
        score = path.get("normalizedScore", 0)

        prefix = _impact_prefix(impact)
        lines += [
            f"#### {prefix} Path `{path.get('pathId', i)}` — {impact} Impact",
            "",
            f"| Field | Value |",
            f"|-------|-------|",
            f"| Risk Score | {risk:.1f} (normalized: {score:.0f}/100) |",
            f"| Hops | {path.get('hops', 0)} |",
            f"| Impact | **{impact}** |",
            f"| Through Critical Edge | {'Yes' if path.get('throughCritical') else 'No'} |",
            "",
            f"**Attack Chain:**",
            "",
            f"```",
            f"  {' → '.join(nodes)}",
            f"```",
            "",
            f"**Techniques Used:** {', '.join(edge_types)}",
            "",
        ]

        # MITRE techniques for this path
        mitre_items = []
        for et in edge_types:
            t = EDGE_TO_MITRE.get(et)
            if t:
                tid = t.get("subTechniqueId") or t["techniqueId"]
                mitre_items.append(f"`{tid}` {t['name'].split(':')[0]}")
        if mitre_items:
            lines.append(f"**MITRE ATT&CK:** {' · '.join(mitre_items)}")
            lines.append("")

        lines.append("---")
        lines.append("")

    # Critical bottleneck edges
    lines += [
        "### Critical Bottleneck Edges",
        "",
        "These edges appear in the highest percentage of attack paths.",
        "Removing a single bottleneck edge can eliminate multiple attack paths simultaneously.",
        "",
        "| Rank | Relation | Source | Target | Paths | % Coverage |",
        "|------|----------|--------|--------|-------|-----------|",
    ]
    for rank, edge in enumerate(critical_edges[:10], 1):
        pct = edge.get("percentOfPaths", 0)
        bar = _risk_bar(pct, 8)
        lines.append(
            f"| {rank} | `{edge.get('relation','?')}` | `{edge.get('source','?')}` "
            f"| `{edge.get('target','?')}` | {edge.get('traversalCount',0)} | {pct:.1f}% {bar} |"
        )

    lines.append("")
    return "\n".join(lines)


def generate_mitre_section(paths: list[dict]) -> str:
    usage = get_techniques_for_paths(paths)

    lines = [
        "## MITRE ATT&CK Coverage",
        "",
        f"**{len(usage)} unique techniques** identified across {len(paths)} attack paths.",
        "",
    ]

    if not usage:
        lines.append("_No MITRE techniques identified._")
        return "\n".join(lines)

    # Group by tactic
    by_tactic: dict[str, list] = {}
    for tid, info in usage.items():
        tactic_name = TACTIC_NAMES.get(info.get("tacticId", ""), info.get("tactic", "Unknown"))
        by_tactic.setdefault(tactic_name, []).append((tid, info))

    lines += [
        "| Tactic | Technique ID | Name | Paths | Severity | Relations |",
        "|--------|-------------|------|-------|----------|-----------|",
    ]

    severity_order = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}
    all_techniques = []
    for tactic_name, techniques in by_tactic.items():
        for tid, info in techniques:
            all_techniques.append((tactic_name, tid, info))

    all_techniques.sort(key=lambda x: severity_order.get(x[2].get("severity", "Low"), 1), reverse=True)

    for tactic_name, tid, info in all_techniques:
        sev = info.get("severity", "Low")
        prefix = _impact_prefix(sev)
        lines.append(
            f"| {tactic_name} | `{tid}` | {info.get('name', '').split(':')[0]} "
            f"| {info.get('usageCount', 0)} | {prefix} {sev} | {', '.join(info.get('relations', []))} |"
        )

    lines.append("")
    return "\n".join(lines)


def generate_risk_heatmap(paths: list[dict]) -> str:
    lines = [
        "## Risk Heatmap",
        "",
        "Node risk contribution based on traversal frequency × path risk score:",
        "",
    ]

    if not paths:
        lines.append("_No path data available._")
        return "\n".join(lines)

    node_risk: dict[str, float] = {}
    for path in paths:
        risk = path.get("risk", 0)
        for node in path.get("nodes", []):
            node_risk[node] = node_risk.get(node, 0) + risk

    max_risk = max(node_risk.values(), default=1)
    sorted_nodes = sorted(node_risk.items(), key=lambda x: x[1], reverse=True)[:15]

    lines += [
        "| Node | Risk | Heat Bar | Level |",
        "|------|------|----------|-------|",
    ]

    for node, risk in sorted_nodes:
        pct = risk / max_risk * 100
        bar = _risk_bar(pct, 12)
        level = (
            "CRITICAL" if pct >= 80 else
            "HIGH" if pct >= 60 else
            "MEDIUM" if pct >= 40 else
            "LOW"
        )
        lines.append(f"| `{node}` | {risk:.0f} | `{bar}` | {level} |")

    lines.append("")
    return "\n".join(lines)


def generate_remediation_roadmap(mitigations: list[dict]) -> str:
    lines = ["## Remediation Roadmap", ""]

    by_priority: dict[str, list] = {
        "Critical": [], "High": [], "Medium": [], "Low": [],
    }
    for m in mitigations:
        p = m.get("priority", "Low")
        if p in by_priority:
            by_priority[p].append(m)

    timelines = {
        "Critical": "0–7 days",
        "High": "7–30 days",
        "Medium": "30–90 days",
        "Low": "90–180 days",
    }
    headers = {
        "Critical": "[!!!] CRITICAL",
        "High": "[!! ] HIGH",
        "Medium": "[ ! ] MEDIUM",
        "Low": "[   ] LOW",
    }

    total = sum(len(v) for v in by_priority.values())
    lines.append(f"**{total} remediation items** sorted by priority and estimated effort.\n")

    for priority in ["Critical", "High", "Medium", "Low"]:
        items = by_priority[priority]
        if not items:
            continue
        lines += [
            f"### {headers[priority]} — {timelines[priority]}",
            "",
        ]
        for i, item in enumerate(items, 1):
            lines += [
                f"**{i}. {item.get('title', 'N/A')}**",
                f"_Category: {item.get('category', 'N/A')}_",
                "",
                f"> {item.get('detail', '')}",
                "",
            ]

    return "\n".join(lines)


# ── Full report assembler ─────────────────────────────────────────────────────

def generate_full_report(
    result: dict,
    mitigations: list[dict],
    params: dict,
    dataset_info: dict,
) -> str:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    header = "\n".join([
        "# Attack Path Assessment Report",
        "",
        f"**Generated:** {ts}  ",
        "**Tool:** Attack Path Forecaster v2.0  ",
        "**Classification:** CONFIDENTIAL",
        "",
        "---",
        "",
        "## Table of Contents",
        "",
        "1. [Executive Summary](#executive-summary)",
        "2. [Technical Findings](#technical-findings)",
        "3. [MITRE ATT&CK Coverage](#mitre-attck-coverage)",
        "4. [Risk Heatmap](#risk-heatmap)",
        "5. [Remediation Roadmap](#remediation-roadmap)",
        "",
        "---",
        "",
    ])

    exec_sum = generate_executive_summary(result, dataset_info, params)
    tech = generate_technical_findings(result, params)
    mitre = generate_mitre_section(result.get("paths", []))
    heatmap = generate_risk_heatmap(result.get("paths", []))
    roadmap = generate_remediation_roadmap(mitigations)

    footer = "\n".join([
        "",
        "---",
        "",
        "_This report was automatically generated by Attack Path Forecaster._  ",
        "_Review findings with a qualified security professional before taking action._",
    ])

    return "\n\n".join([header, exec_sum, tech, mitre, heatmap, roadmap, footer])
