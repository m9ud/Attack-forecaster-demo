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
    "GenericWrite": (
        "has GenericWrite on {target}\n"
        "  → Can write to non-protected attributes\n"
        "  → Can set SPN for Kerberoasting or modify logon script"
    ),
    "WriteOwner": (
        "has WriteOwner on {target}\n"
        "  → Can change object owner to self\n"
        "  → Then grant self full control via WriteDACL"
    ),
    "AddSelf": (
        "has AddSelf on {target}\n"
        "  → Can add themselves as a member of the group\n"
        "  → Inherits all group permissions immediately"
    ),
    "AddMember": (
        "has AddMember on {target}\n"
        "  → Can add any principal to the group\n"
        "  → Grants group permissions to the added principal"
    ),
    "ForceChangePassword": (
        "has ForceChangePassword on {target}\n"
        "  → Can reset the user's password without knowing the old one\n"
        "  → Takes over the account entirely"
    ),
    "DCSync": (
        "has DCSync rights on {target}\n"
        "  → Can replicate directory changes from the DC\n"
        "  → Extracts all password hashes including krbtgt"
    ),
    "SQLAdmin": (
        "is SQL sysadmin on {target}\n"
        "  → Can execute commands via xp_cmdshell\n"
        "  → Gains OS-level code execution on the server"
    ),
}

PRIV_GAIN = {
    "WriteDACL": "ACL control over {target}",
    "GenericAll": "Full control of {target}",
    "AdminTo": "Local admin on {target}",
    "HasSession": "Credentials of {target}",
    "CanRDP": "Interactive session on {target}",
    "MemberOf": "Group membership in {target}",
    "GenericWrite": "Write access on {target}",
    "WriteOwner": "Ownership of {target}",
    "AddSelf": "Self-added membership in {target}",
    "AddMember": "Can add members to {target}",
    "ForceChangePassword": "Account takeover of {target}",
    "DCSync": "All password hashes from {target}",
    "SQLAdmin": "OS-level execution on {target}",
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
