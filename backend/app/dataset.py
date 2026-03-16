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
    "GenericWrite": 8, "WriteOwner": 8,
    "AddSelf": 7, "AddMember": 7,
    "SQLAdmin": 8,
}

# ── Map GOAD ACL right names to BloodHound-style relation names ──
_GOAD_ACL_MAP = {
    "Ext-User-Force-Change-Password": "ForceChangePassword",
    "GenericWrite": "GenericWrite",
    "WriteDacl": "WriteDACL",
    "Ext-Self-Self-Membership": "AddSelf",
    "Ext-Write-Self-Membership": "AddMember",
    "WriteOwner": "WriteOwner",
    "GenericAll": "GenericAll",
    "ReadProperty": None,      # not an attack relationship
    "GenericExecute": None,    # not an attack relationship
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


def is_goad_format(raw: dict) -> bool:
    """Detect if a JSON dict is in GOAD lab config format."""
    return "lab" in raw and "hosts" in raw.get("lab", {})


def convert_goad(raw: dict) -> dict:
    """
    Convert a GOAD (Game of Active Directory) lab config JSON into
    the app's native dataset format (nodes, edges, weights, etc.).
    """
    lab = raw["lab"]
    hosts = lab["hosts"]
    domains = lab["domains"]

    nodes = []
    edges = []
    node_names: set[str] = set()
    edge_id = 0

    def _next_eid() -> str:
        nonlocal edge_id
        edge_id += 1
        return f"E{edge_id:03d}"

    def _add_node(nid: str, name: str, ntype: str, priv: str = "",
                  hv: bool = False, subnet: str = ""):
        if name not in node_names:
            node_names.add(name)
            nodes.append({"id": nid, "name": name, "type": ntype,
                          "privilegeLevel": priv, "highValue": hv,
                          "subnet": subnet})

    def _add_edge(source: str, target: str, relation: str):
        if source in node_names and target in node_names:
            edges.append({"id": _next_eid(), "source": source,
                          "target": target, "relation": relation})

    # ── Subnets (one per domain) ──
    subnets = []
    domain_subnet: dict[str, str] = {}
    for i, dname in enumerate(domains):
        sid = f"subnet-{i+1}"
        subnets.append({"id": sid, "cidr": f"10.10.{(i+1)*10}.0/24", "label": dname})
        domain_subnet[dname] = sid

    # ── Host nodes ──
    ncount = 0
    host_hostname: dict[str, str] = {}
    for hkey, hinfo in hosts.items():
        ncount += 1
        hostname = hinfo["hostname"]
        host_hostname[hkey] = hostname
        htype = "Server" if hinfo["type"] in ("dc", "server") else "Computer"
        priv = "Domain Controller" if hinfo["type"] == "dc" else ""
        hv = hinfo["type"] == "dc"
        subnet = domain_subnet.get(hinfo.get("domain", ""), "")
        _add_node(f"H{ncount:02d}", hostname, htype, priv, hv, subnet)

    # ── Domain groups + users ──
    gcount = 0
    ucount = 0
    da_groups: dict[str, str] = {}  # domain → DA group name

    for dname, dinfo in domains.items():
        subnet = domain_subnet.get(dname, "")
        # Determine DA group name (unique per domain)
        is_child = dname.count(".") > 1
        da_name = "Domain Admins" if not is_child else f"Domain Admins {dinfo.get('netbios_name', '').upper()}"
        gcount += 1
        _add_node(f"G{gcount:02d}", da_name, "Group", "", True, subnet)
        da_groups[dname] = da_name

        # Regular groups
        for scope in ("universal", "global", "domainlocal"):
            for gname in dinfo.get("groups", {}).get(scope, {}):
                gcount += 1
                _add_node(f"G{gcount:02d}", gname, "Group", "", False, subnet)

        # Users
        for ukey, uinfo in dinfo.get("users", {}).items():
            ucount += 1
            is_da = "Domain Admins" in uinfo.get("groups", [])
            priv = "Domain Admin" if is_da else "Low"
            _add_node(f"U{ucount:02d}", ukey, "User", priv, is_da, "")

            # MemberOf edges
            for grp in uinfo.get("groups", []):
                if grp == "Domain Admins":
                    _add_edge(ukey, da_groups[dname], "MemberOf")
                elif grp == "Protected Users":
                    pass  # skip defensive-only group
                else:
                    if grp not in node_names:
                        gcount += 1
                        _add_node(f"G{gcount:02d}", grp, "Group", "", False, subnet)
                    _add_edge(ukey, grp, "MemberOf")

    # ── Host local groups → AdminTo / CanRDP edges ──
    for hkey, hinfo in hosts.items():
        hostname = host_hostname[hkey]
        for member in hinfo.get("local_groups", {}).get("Administrators", []):
            name = member.split("\\")[-1]
            if name in node_names:
                _add_edge(name, hostname, "AdminTo")
        for member in hinfo.get("local_groups", {}).get("Remote Desktop Users", []):
            name = member.split("\\")[-1]
            if name in node_names:
                _add_edge(name, hostname, "CanRDP")

    # ── Domain Admins → AdminTo + DCSync on their DC ──
    for dname, dinfo in domains.items():
        dc_key = dinfo.get("dc", "")
        dc_hostname = host_hostname.get(dc_key, "")
        da_name = da_groups.get(dname, "")
        if dc_hostname and da_name:
            _add_edge(da_name, dc_hostname, "AdminTo")
            _add_edge(da_name, dc_hostname, "DCSync")

    # ── ACL edges ──
    for dname, dinfo in domains.items():
        for acl_key, acl in dinfo.get("acls", {}).items():
            right = _GOAD_ACL_MAP.get(acl["right"])
            if right is None:
                continue
            src = acl["for"]
            tgt = acl["to"]
            # Resolve computer$ references
            for hkey, hinfo in hosts.items():
                if tgt == f"{hinfo['hostname']}$":
                    tgt = hinfo["hostname"]
                    break
            if tgt == "Domain Admins":
                tgt = da_groups.get(dname, tgt)
            if src in node_names and tgt in node_names:
                _add_edge(src, tgt, right)

    # ── Inferred HasSession edges (from autologon + credentials) ──
    for hkey, hinfo in hosts.items():
        hostname = host_hostname[hkey]
        # DC admins typically have sessions on their DC
        dname = hinfo.get("domain", "")
        if dname in domains:
            for ukey, uinfo in domains[dname].get("users", {}).items():
                if "Domain Admins" in uinfo.get("groups", []):
                    if hinfo["type"] == "dc" and hinfo["domain"] == dname:
                        _add_edge(hostname, ukey, "HasSession")
        # Autologon
        for alkey, al in hinfo.get("vulns_vars", {}).get("autologon", {}).items():
            uname = al.get("username", "").split("\\")[-1]
            if uname in node_names:
                _add_edge(hostname, uname, "HasSession")
        # Stored credentials
        for ckey, cred in hinfo.get("vulns_vars", {}).get("credentials", {}).items():
            uname = cred.get("username", "").split("\\")[-1]
            target_host = ckey.replace("TERMSRV/", "")
            for h2key, h2info in hosts.items():
                if target_host == h2info["hostname"]:
                    _add_edge(host_hostname[h2key], uname, "HasSession")

    # ── MSSQL edges ──
    for hkey, hinfo in hosts.items():
        hostname = host_hostname[hkey]
        mssql = hinfo.get("mssql", {})
        for sa in mssql.get("sysadmins", []):
            uname = sa.split("\\")[-1]
            if uname in node_names:
                _add_edge(uname, hostname, "SQLAdmin")

    # ── Child → parent domain trust (SIDHistory escalation) ──
    domain_list = list(domains.keys())
    for dname in domain_list:
        parts = dname.split(".")
        if len(parts) > 2:
            parent = ".".join(parts[1:])
            if parent in domains:
                da_child = da_groups.get(dname, "")
                parent_dc_key = domains[parent].get("dc", "")
                parent_dc = host_hostname.get(parent_dc_key, "")
                if da_child and parent_dc:
                    _add_edge(da_child, parent_dc, "GenericAll")

    # ── Build start options (low-priv users with interesting outgoing edges) ──
    edge_sources = {e["source"] for e in edges}
    start_options = [
        n["name"] for n in nodes
        if n["type"] == "User" and n["privilegeLevel"] == "Low"
        and n["name"] in edge_sources
    ][:4]

    # ── Critical edge (GenericAll on DA group) ──
    crit_id = ""
    for e in edges:
        if e["relation"] == "GenericAll" and "Domain Admins" in e["target"]:
            crit_id = e["id"]
            break

    return {
        "weights": dict(DEFAULT_WEIGHTS),
        "subnets": subnets,
        "nodes": nodes,
        "edges": edges,
        "criticalEdgeId": crit_id,
        "startOptions": start_options,
        "scenarioPresets": {},
    }


def validate_dataset(raw: dict) -> list[str]:
    """
    Validate an uploaded JSON dataset. Returns a list of error strings
    (empty means valid).  Also accepts GOAD lab config format.
    """
    # Auto-convert GOAD format before validation
    if is_goad_format(raw):
        return []  # GOAD format will be converted at load time

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
