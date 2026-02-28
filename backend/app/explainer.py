"""
Explanation Engine — generates human-readable step-by-step attack chain
reasoning from a discovered path.
"""

RELATION_DESC = {
    "WriteDACL": (
        "has WriteDACL on {target}\n"
        "  → Can modify the Discretionary Access Control List\n"
        "  → Grants self full control permissions on the object"
    ),
    "GenericAll": (
        "has GenericAll on {target}\n"
        "  → Full control over the object\n"
        "  → Can modify group membership or object properties"
    ),
    "AdminTo": (
        "has AdminTo on {target}\n"
        "  → Gains local administrator privileges on the machine"
    ),
    "HasSession": (
        "{source} has active session of {target}\n"
        "  → Local admin can extract credentials from memory\n"
        "  → Obtains NTLM hash or Kerberos ticket of {target}"
    ),
    "CanRDP": (
        "can RDP to {target}\n"
        "  → Establishes remote desktop session\n"
        "  → Gains interactive access on the machine"
    ),
    "MemberOf": (
        "is MemberOf {target}\n"
        "  → Inherits all permissions granted to the group"
    ),
}

PRIV_GAIN = {
    "WriteDACL": "ACL control over {target}",
    "GenericAll": "Full control of {target}",
    "AdminTo": "Local admin on {target}",
    "HasSession": "Credentials of {target}",
    "CanRDP": "Interactive session on {target}",
    "MemberOf": "Group membership in {target}",
}


def explain_path(path_info: dict) -> str:
    """Return multi-line explanation text for one attack path."""
    edges = path_info["edges"]
    lines: list[str] = [
        f"═══ Attack Chain: {path_info['pathId']} ═══",
        f"Risk Score: {path_info['risk']}  |  Normalized: {path_info.get('normalizedScore', 'N/A')}/100",
        f"Impact: {path_info.get('impactEstimation', 'Unknown')}  |  Hops: {path_info['hops']}",
        f"Through Critical Edge: {'Yes ★' if path_info['throughCritical'] else 'No'}",
        "",
    ]

    for i, edge in enumerate(edges):
        step = i + 1
        rel = edge["relation"]
        src = edge["source"]
        tgt = edge["target"]
        desc = RELATION_DESC.get(rel, f"connects to {tgt} via {rel}")
        desc = desc.format(source=src, target=tgt)
        priv = PRIV_GAIN.get(rel, f"Access to {tgt}").format(source=src, target=tgt)

        lines.append(f"STEP {step}: {src}")
        lines.append(f"  │ {desc}")
        lines.append(f"  │ Privilege gained: {priv}")

        if step < len(edges):
            lines.append("  ▼")
        else:
            lines.append("  ▼")
            lines.append(f"RESULT: {tgt} — Target Reached")

    lines.append("")
    lines.append("── Risk Breakdown ──")
    cumulative = 0
    for i, edge in enumerate(edges):
        cumulative += edge["weight"]
        lines.append(
            f"  Step {i + 1}: [{edge['edgeId']}] {edge['relation']}"
            f"  (weight={edge['weight']}, cumulative={cumulative})"
        )

    from math import sqrt
    lines.append(
        f"  Total: {path_info['sumWeights']} / √{path_info['hops']}"
        f" = {path_info['risk']}"
    )
    return "\n".join(lines)
