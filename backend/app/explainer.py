"""
Explanation Engine — generates human-readable step-by-step attack chain
reasoning, including MITRE ATT&CK kill-chain phase classification.
"""

# ── Kill-chain phase per relation ───────────────────────────────────────────
KILL_CHAIN_PHASE: dict[str, str] = {
    "MemberOf":           "Reconnaissance",
    "HasSession":         "Credential Access",
    "CanRDP":             "Lateral Movement",
    "AdminTo":            "Privilege Escalation",
    "WriteDACL":          "Privilege Escalation",
    "GenericAll":         "Privilege Escalation",
    "GenericWrite":       "Persistence",
    "WriteOwner":         "Privilege Escalation",
    "AddSelf":            "Privilege Escalation",
    "AddMember":          "Privilege Escalation",
    "ForceChangePassword":"Credential Access",
    "DCSync":             "Exfiltration",
    "ReadLAPSPassword":   "Credential Access",
    "AllExtendedRights":  "Privilege Escalation",
    "Owns":               "Privilege Escalation",
    "SQLAdmin":           "Execution",
}

# ── MITRE ATT&CK technique IDs ─────────────────────────────────────────────
MITRE_TECHNIQUE: dict[str, str] = {
    "HasSession":         "T1003 (Credential Dumping)",
    "CanRDP":             "T1021.001 (Remote Desktop Protocol)",
    "AdminTo":            "T1078 (Valid Accounts — Admin)",
    "WriteDACL":          "T1222 (File & Directory Permissions Modification)",
    "GenericAll":         "T1078 (Valid Accounts — Full Control)",
    "GenericWrite":       "T1098 (Account Manipulation)",
    "WriteOwner":         "T1222 (Permissions Modification)",
    "AddSelf":            "T1098 (Account Manipulation)",
    "AddMember":          "T1098 (Account Manipulation)",
    "ForceChangePassword":"T1098.001 (Account Manipulation — Password)",
    "DCSync":             "T1003.006 (DCSync)",
    "ReadLAPSPassword":   "T1552 (Unsecured Credentials — LAPS)",
    "AllExtendedRights":  "T1078 (Valid Accounts)",
    "DCSync":             "T1003.006 (OS Credential Dumping — DCSync)",
    "SQLAdmin":           "T1059 (Command and Scripting Interpreter — SQL)",
    "MemberOf":           "T1069 (Permission Groups Discovery)",
}

RELATION_DESC: dict[str, str] = {
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
    "ReadLAPSPassword": (
        "can read LAPS password on {target}\n"
        "  → Retrieves the local administrator password in plaintext\n"
        "  → Gains local admin access to the machine"
    ),
    "AllExtendedRights": (
        "has AllExtendedRights on {target}\n"
        "  → Can perform sensitive operations (ForceChangePassword, ReadLAPSPassword)\n"
        "  → Effective full control over the object"
    ),
    "Owns": (
        "Owns {target}\n"
        "  → As owner, can modify the object's DACL\n"
        "  → Effectively equivalent to WriteDACL"
    ),
}

PRIV_GAIN: dict[str, str] = {
    "WriteDACL":          "ACL control over {target}",
    "GenericAll":         "Full control of {target}",
    "AdminTo":            "Local admin on {target}",
    "HasSession":         "Credentials of {target}",
    "CanRDP":             "Interactive session on {target}",
    "MemberOf":           "Group membership in {target}",
    "GenericWrite":       "Write access on {target}",
    "WriteOwner":         "Ownership of {target}",
    "AddSelf":            "Self-added membership in {target}",
    "AddMember":          "Can add members to {target}",
    "ForceChangePassword":"Account takeover of {target}",
    "DCSync":             "All password hashes from {target}",
    "SQLAdmin":           "OS-level execution on {target}",
    "ReadLAPSPassword":   "Local admin password for {target}",
    "AllExtendedRights":  "Extended privileges over {target}",
    "Owns":               "Ownership → WriteDACL on {target}",
}

# Phase labels for readable output
_PHASE_ICON = {
    "Reconnaissance":      "[RECON]",
    "Credential Access":   "[CRED]",
    "Lateral Movement":    "[LATERAL]",
    "Privilege Escalation":"[PRIVESC]",
    "Persistence":         "[PERSIST]",
    "Execution":           "[EXEC]",
    "Exfiltration":        "[EXFIL]",
}


def explain_path(path_info: dict) -> str:
    """Return multi-line explanation text for one attack path."""
    edges = path_info["edges"]
    exploit_ease = path_info.get("exploitEase", None)
    stealth = path_info.get("stealthFactor", None)

    lines: list[str] = [
        f"═══ Attack Chain: {path_info['pathId']} ═══",
        f"Risk Score   : {path_info['risk']}",
        f"Normalized   : {path_info.get('normalizedScore', 'N/A')}/100",
        f"Impact       : {path_info.get('impactEstimation', 'Unknown')}",
        f"Hops         : {path_info['hops']}",
    ]

    if exploit_ease is not None:
        lines.append(f"Exploit Ease : {exploit_ease:.0%}  (1.0 = trivially easy)")
    if stealth is not None:
        lines.append(f"Stealth      : {stealth:.0%}  (1.0 = completely invisible)")

    lines.append(f"Critical Edge: {'Yes ★' if path_info['throughCritical'] else 'No'}")
    lines.append("")

    last_phase = None
    for i, edge in enumerate(edges):
        step = i + 1
        rel = edge["relation"]
        src = edge["source"]
        tgt = edge["target"]

        phase = KILL_CHAIN_PHASE.get(rel, "Unknown")
        phase_icon = _PHASE_ICON.get(phase, "◆")
        mitre = MITRE_TECHNIQUE.get(rel, "")

        # Print phase header when it changes
        if phase != last_phase:
            lines.append(f"── {phase_icon} {phase.upper()} ──")
            last_phase = phase

        desc = RELATION_DESC.get(rel, f"connects to {tgt} via {rel}")
        desc = desc.format(source=src, target=tgt)
        priv = PRIV_GAIN.get(rel, f"Access to {tgt}").format(source=src, target=tgt)

        lines.append(f"STEP {step}: {src}")
        lines.append(f"  │ {desc}")
        lines.append(f"  │ Privilege gained : {priv}")
        if mitre:
            lines.append(f"  │ MITRE ATT&CK    : {mitre}")

        if step < len(edges):
            lines.append("  ▼")
        else:
            lines.append("  ▼")
            lines.append(f"RESULT: {tgt} — Target Compromised ★")

    lines.append("")
    lines.append("── Risk Breakdown ──")
    cumulative = 0
    for i, edge in enumerate(edges):
        cumulative += edge["weight"]
        ease = KILL_CHAIN_PHASE.get(edge["relation"], "?")
        lines.append(
            f"  Step {i+1}: [{edge['edgeId']}] {edge['relation']}"
            f"  weight={edge['weight']}, cumulative={cumulative}"
            f"  | phase: {ease}"
        )

    lines.append(
        f"  Total weight: {path_info['sumWeights']} hops: {path_info['hops']}"
        f"  → Risk: {path_info['risk']}"
    )
    return "\n".join(lines)
