"""
MITRE ATT&CK Enterprise technique mappings for Active Directory edge relations.
Each relation type maps to a real ATT&CK technique with full metadata.
"""

from __future__ import annotations

# ── Edge → MITRE Technique mapping ─────────────────────────────────────────
EDGE_TO_MITRE: dict[str, dict] = {
    "MemberOf": {
        "techniqueId": "T1069",
        "subTechniqueId": "T1069.002",
        "name": "Permission Groups Discovery: Domain Groups",
        "tactic": "Discovery",
        "tacticId": "TA0007",
        "severity": "Low",
        "description": "Adversaries enumerate domain group membership to understand privilege structure.",
    },
    "AdminTo": {
        "techniqueId": "T1021",
        "subTechniqueId": "T1021.006",
        "name": "Remote Services: Windows Remote Management",
        "tactic": "Lateral Movement",
        "tacticId": "TA0008",
        "severity": "High",
        "description": "Admin access enables lateral movement via remote management services.",
    },
    "HasSession": {
        "techniqueId": "T1078",
        "subTechniqueId": None,
        "name": "Valid Accounts",
        "tactic": "Credential Access",
        "tacticId": "TA0006",
        "severity": "High",
        "description": "Adversaries leverage existing authenticated sessions to move laterally.",
    },
    "CanRDP": {
        "techniqueId": "T1021",
        "subTechniqueId": "T1021.001",
        "name": "Remote Services: Remote Desktop Protocol",
        "tactic": "Lateral Movement",
        "tacticId": "TA0008",
        "severity": "High",
        "description": "RDP access enables interactive lateral movement to remote systems.",
    },
    "GenericAll": {
        "techniqueId": "T1484",
        "subTechniqueId": "T1484.001",
        "name": "Domain Policy Modification",
        "tactic": "Privilege Escalation",
        "tacticId": "TA0004",
        "severity": "Critical",
        "description": "Full control ACE grants unrestricted modification of AD objects and policies.",
    },
    "WriteDACL": {
        "techniqueId": "T1222",
        "subTechniqueId": "T1222.001",
        "name": "File and Directory Permissions Modification",
        "tactic": "Defense Evasion",
        "tacticId": "TA0005",
        "severity": "Critical",
        "description": "WriteDACL allows granting arbitrary permissions to any object.",
    },
    "WriteOwner": {
        "techniqueId": "T1222",
        "subTechniqueId": None,
        "name": "File and Directory Permissions Modification",
        "tactic": "Defense Evasion",
        "tacticId": "TA0005",
        "severity": "Critical",
        "description": "Changing object ownership grants full control over the target object.",
    },
    "Owns": {
        "techniqueId": "T1222",
        "subTechniqueId": None,
        "name": "File and Directory Permissions Modification",
        "tactic": "Defense Evasion",
        "tacticId": "TA0005",
        "severity": "High",
        "description": "Object ownership implicitly grants full control and DACL modification rights.",
    },
    "DCSync": {
        "techniqueId": "T1003",
        "subTechniqueId": "T1003.006",
        "name": "OS Credential Dumping: DCSync",
        "tactic": "Credential Access",
        "tacticId": "TA0006",
        "severity": "Critical",
        "description": "DCSync simulates DC replication to extract all domain credentials including krbtgt.",
    },
    "ForceChangePassword": {
        "techniqueId": "T1098",
        "subTechniqueId": None,
        "name": "Account Manipulation",
        "tactic": "Persistence",
        "tacticId": "TA0003",
        "severity": "High",
        "description": "Forcefully changing an account password allows immediate takeover.",
    },
    "ReadLAPSPassword": {
        "techniqueId": "T1555",
        "subTechniqueId": None,
        "name": "Credentials from Password Stores",
        "tactic": "Credential Access",
        "tacticId": "TA0006",
        "severity": "High",
        "description": "Reading LAPS attributes exposes local administrator credentials.",
    },
    "AllExtendedRights": {
        "techniqueId": "T1078",
        "subTechniqueId": "T1078.002",
        "name": "Valid Accounts: Domain Accounts",
        "tactic": "Credential Access",
        "tacticId": "TA0006",
        "severity": "High",
        "description": "Extended rights allow reading sensitive attributes including passwords.",
    },
    "GenericWrite": {
        "techniqueId": "T1098",
        "subTechniqueId": None,
        "name": "Account Manipulation",
        "tactic": "Persistence",
        "tacticId": "TA0003",
        "severity": "High",
        "description": "GenericWrite enables modification of arbitrary object attributes.",
    },
    "AddSelf": {
        "techniqueId": "T1098",
        "subTechniqueId": "T1098.007",
        "name": "Account Manipulation: Additional Group Membership",
        "tactic": "Persistence",
        "tacticId": "TA0003",
        "severity": "High",
        "description": "Self-membership addition to privileged groups for persistent elevated access.",
    },
    "AddMember": {
        "techniqueId": "T1098",
        "subTechniqueId": "T1098.007",
        "name": "Account Manipulation: Additional Group Membership",
        "tactic": "Persistence",
        "tacticId": "TA0003",
        "severity": "High",
        "description": "Adding accounts to privileged groups enables lateral movement and escalation.",
    },
    "SQLAdmin": {
        "techniqueId": "T1190",
        "subTechniqueId": None,
        "name": "Exploit Public-Facing Application",
        "tactic": "Initial Access",
        "tacticId": "TA0001",
        "severity": "Critical",
        "description": "SQL admin rights enable OS command execution via xp_cmdshell stored procedure.",
    },
}

# ── ATT&CK Tactic metadata ───────────────────────────────────────────────────
TACTIC_ORDER = [
    "TA0001", "TA0002", "TA0003", "TA0004", "TA0005",
    "TA0006", "TA0007", "TA0008", "TA0009", "TA0010", "TA0011",
]

TACTIC_NAMES = {
    "TA0001": "Initial Access",
    "TA0002": "Execution",
    "TA0003": "Persistence",
    "TA0004": "Privilege Escalation",
    "TA0005": "Defense Evasion",
    "TA0006": "Credential Access",
    "TA0007": "Discovery",
    "TA0008": "Lateral Movement",
    "TA0009": "Collection",
    "TA0010": "Exfiltration",
    "TA0011": "Command and Control",
}

SEVERITY_ORDER = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}


def get_technique(relation: str) -> dict | None:
    """Return MITRE technique info for a given relation type, or None."""
    return EDGE_TO_MITRE.get(relation)


def get_techniques_for_paths(paths: list[dict]) -> dict[str, dict]:
    """
    Aggregate MITRE technique coverage across all paths.
    Returns: techniqueId -> enriched technique dict with usage stats.
    """
    usage: dict[str, dict] = {}

    for path in paths:
        for edge_type in path.get("edgeTypes", []):
            technique = EDGE_TO_MITRE.get(edge_type)
            if not technique:
                continue
            tid = technique.get("subTechniqueId") or technique["techniqueId"]
            if tid not in usage:
                usage[tid] = {
                    **technique,
                    "usageCount": 0,
                    "pathIds": [],
                    "relations": [],
                }
            usage[tid]["usageCount"] += 1
            if path["pathId"] not in usage[tid]["pathIds"]:
                usage[tid]["pathIds"].append(path["pathId"])
            if edge_type not in usage[tid]["relations"]:
                usage[tid]["relations"].append(edge_type)

    return usage


def build_navigator_layer(paths: list[dict], dataset_name: str = "Attack Path Analysis") -> dict:
    """
    Build an ATT&CK Navigator 4.x compatible layer JSON.
    Import at https://mitre-attack.github.io/attack-navigator/
    """
    usage = get_techniques_for_paths(paths)

    techniques_layer: list[dict] = []
    for tid, info in usage.items():
        score = min(100, info["usageCount"] * 20)
        entry: dict = {
            "techniqueID": info["techniqueId"],
            "score": score,
            "comment": f"Via: {', '.join(info['relations'])} ({info['usageCount']} paths)",
            "enabled": True,
            "metadata": [],
            "links": [],
            "showSubtechniques": True,
        }
        if info.get("subTechniqueId"):
            entry["subTechniqueID"] = info["subTechniqueId"]
        techniques_layer.append(entry)

    return {
        "name": dataset_name,
        "versions": {"attack": "14", "navigator": "4.9.1", "layer": "4.5"},
        "domain": "enterprise-attack",
        "description": (
            f"Generated by Attack Path Forecaster — {len(paths)} paths, "
            f"{len(usage)} unique techniques"
        ),
        "filters": {"platforms": ["Windows", "Azure AD", "Office 365"]},
        "sorting": 3,
        "layout": {
            "layout": "side",
            "aggregateFunction": "average",
            "showID": True,
            "showName": True,
            "showAggregateScores": True,
            "countUnscored": False,
        },
        "hideDisabled": False,
        "techniques": techniques_layer,
        "gradient": {"colors": ["#ffffff", "#ff6666"], "minValue": 0, "maxValue": 100},
        "legendItems": [],
        "metadata": [],
        "links": [],
        "showTacticRowBackground": True,
        "tacticRowBackground": "#205b8c",
        "selectTechniquesAcrossTactics": True,
        "selectSubtechniquesWithParent": False,
        "selectVisibleTechniques": False,
    }
