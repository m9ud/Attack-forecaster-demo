"""
Attack Path Forecaster — Dataset loader

Loads the active dataset from a JSON file.
Ships with a bundled default dataset; can be hot-swapped at runtime
via the /upload-dataset endpoint.
"""

from __future__ import annotations

import io
import json
import copy
import zipfile
from pathlib import Path

# Default weight table (used when edges don't carry their own weight)
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

# Map GOAD ACL right names to relation names
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


# Module-level active dataset (starts with default demo dataset)
_active = _init_default()

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

    # Subnets (one per domain)
    subnets = []
    domain_subnet: dict[str, str] = {}
    for i, dname in enumerate(domains):
        sid = f"subnet-{i+1}"
        subnets.append({"id": sid, "cidr": f"10.10.{(i+1)*10}.0/24", "label": dname})
        domain_subnet[dname] = sid

    # Host nodes
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

    # Domain groups + users
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

    # Host local groups → AdminTo / CanRDP edges
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

    # Domain Admins → AdminTo + DCSync on their DC
    for dname, dinfo in domains.items():
        dc_key = dinfo.get("dc", "")
        dc_hostname = host_hostname.get(dc_key, "")
        da_name = da_groups.get(dname, "")
        if dc_hostname and da_name:
            _add_edge(da_name, dc_hostname, "AdminTo")
            _add_edge(da_name, dc_hostname, "DCSync")

    # ACL edges
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

    # Inferred HasSession edges (from autologon + credentials)
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

    # MSSQL edges
    for hkey, hinfo in hosts.items():
        hostname = host_hostname[hkey]
        mssql = hinfo.get("mssql", {})
        for sa in mssql.get("sysadmins", []):
            uname = sa.split("\\")[-1]
            if uname in node_names:
                _add_edge(uname, hostname, "SQLAdmin")

    # Child → parent domain trust (SIDHistory escalation)
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

    # Build start options (low-priv users with interesting outgoing edges)
    edge_sources = {e["source"] for e in edges}
    start_options = [
        n["name"] for n in nodes
        if n["type"] == "User" and n["privilegeLevel"] == "Low"
        and n["name"] in edge_sources
    ][:4]

    # Critical edge (GenericAll on DA group)
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


# SharpHound ZIP / AD export converter

# ACE right → relation name
_ACE_MAP: dict[str, str] = {
    "GenericAll":            "GenericAll",
    "WriteDacl":             "WriteDACL",
    "WriteDACL":             "WriteDACL",
    "WriteOwner":            "WriteOwner",
    "GenericWrite":          "GenericWrite",
    "ForceChangePassword":   "ForceChangePassword",
    "AddSelf":               "AddSelf",
    "AddMember":             "AddMember",
    "AllExtendedRights":     "AllExtendedRights",
    "GetChangesAll":         "DCSync",       # DS-Replication-Get-Changes-All
    "GetChanges":            "DCSync",       # paired with GetChangesAll
    "DCSync":                "DCSync",
    "ReadLAPSPassword":      "ReadLAPSPassword",
    "ReadGMSAPassword":      "ReadLAPSPassword",
    "Owns":                  "Owns",
}

# Recognised meta.type values
_KNOWN_TYPES = {"users", "groups", "computers", "domains", "gpos", "ous", "containers"}


def is_sharphound_zip(content: bytes) -> bool:
    """ZIP files start with PK magic bytes — SharpHound always produces a ZIP."""
    return len(content) >= 2 and content[:2] == b"PK"


def is_ad_export_json(raw: dict) -> bool:
    """Detect a single-file AD export JSON (one type per file, with a 'meta' block)."""
    meta = raw.get("meta", {})
    return "data" in raw and meta.get("type") in _KNOWN_TYPES


def _clean_name(full: str) -> str:
    """Strip domain suffix from a full AD name and lowercase it."""
    return full.split("@")[0].split(".")[0].lower() if full else ""


def convert_sharphound_zip(content: bytes) -> dict:
    """Convert a SharpHound ZIP export into the app's native dataset format."""
    # Extract all JSON files from the ZIP
    type_data: dict[str, list] = {}
    with zipfile.ZipFile(io.BytesIO(content)) as zf:
        for entry in zf.namelist():
            if not entry.lower().endswith(".json"):
                continue
            try:
                with zf.open(entry) as f:
                    parsed = json.load(f)
                meta_type = parsed.get("meta", {}).get("type", "")
                if not meta_type:
                    # Guess from filename: "20231015_users.json" → "users"
                    stem = entry.rsplit("/", 1)[-1].replace(".json", "").lower()
                    for t in _KNOWN_TYPES:
                        if t in stem:
                            meta_type = t
                            break
                if meta_type in _KNOWN_TYPES:
                    type_data[meta_type] = parsed.get("data", [])
            except Exception:
                continue

    return _convert_ad_type_data(type_data)


def convert_ad_export_json(raw: dict) -> dict:
    """Convert a single-type AD export JSON file into the native format."""
    meta_type = raw.get("meta", {}).get("type", "")
    return _convert_ad_type_data({meta_type: raw.get("data", [])})


def _convert_ad_type_data(type_data: dict[str, list]) -> dict:
    """Core converter — works on a dict of { type_name → list_of_objects }."""
    # Pass 1: Build SID → clean_name and SID → object_type maps
    sid_name: dict[str, str]  = {}
    sid_type: dict[str, str]  = {}

    _TYPE_MAP = {
        "users":     "User",
        "groups":    "Group",
        "computers": "Computer",
        "domains":   "Group",   # treat domain objects as groups for edge purposes
    }

    for type_key, items in type_data.items():
        node_type = _TYPE_MAP.get(type_key, "")
        for obj in items:
            props = obj.get("Properties", {})
            sid   = props.get("objectid") or obj.get("ObjectIdentifier", "")
            name  = props.get("name", "")
            if sid and name:
                clean = _clean_name(name)
                sid_name[sid] = clean
                sid_type[sid] = node_type

    # Pass 2: Build nodes
    nodes:      list[dict] = []
    node_set:   set[str]   = set()
    subnets:    list[dict] = []
    subnet_set: set[str]   = set()

    # Identify Domain Admin SIDs / group names (for privilege tagging)
    da_names: set[str] = set()
    dc_names: set[str] = set()

    for obj in type_data.get("groups", []):
        props = obj.get("Properties", {})
        raw_name = props.get("name", "")
        if "domain admins" in raw_name.lower() or "enterprise admins" in raw_name.lower():
            da_names.add(_clean_name(raw_name))

    def _add_node(sid: str, name: str, ntype: str, priv: str, hv: bool, subnet: str = "") -> None:
        if name and name not in node_set:
            node_set.add(name)
            nodes.append({
                "id":             sid[:8] if sid else f"N{len(nodes):04d}",
                "name":           name,
                "type":           ntype,
                "privilegeLevel": priv,
                "highValue":      hv,
                "subnet":         subnet,
            })

    # Users
    for obj in type_data.get("users", []):
        props  = obj.get("Properties", {})
        sid    = props.get("objectid", "")
        name   = _clean_name(props.get("name", ""))
        if not name:
            continue
        is_da  = props.get("admincount", False)
        priv   = "Domain Admin" if is_da else "Low"
        _add_node(sid, name, "User", priv, is_da)

    # Groups
    for obj in type_data.get("groups", []):
        props  = obj.get("Properties", {})
        sid    = props.get("objectid", "")
        name   = _clean_name(props.get("name", ""))
        if not name:
            continue
        is_priv = name in da_names
        priv    = "Domain Admin" if is_priv else ""
        _add_node(sid, name, "Group", priv, is_priv)

    # Computers — detect DCs by name heuristic and domains.json list
    dc_sids: set[str] = set()
    for dom in type_data.get("domains", []):
        for dc_ref in dom.get("Properties", {}).get("DomainControllers", []):
            if isinstance(dc_ref, str):
                dc_sids.add(dc_ref)

    # Also collect subnet info from domain objects
    for dom in type_data.get("domains", []):
        props = dom.get("Properties", {})
        dname = props.get("name", "")
        dname_clean = dname.lower()
        if dname_clean and dname_clean not in subnet_set:
            subnet_set.add(dname_clean)
            subnets.append({
                "id":    f"subnet-{len(subnets)+1}",
                "cidr":  f"10.{len(subnets)+1}.0.0/24",
                "label": dname,
            })

    subnet_lookup = {s["label"].lower(): s["id"] for s in subnets}

    for obj in type_data.get("computers", []):
        props  = obj.get("Properties", {})
        sid    = props.get("objectid", "")
        name   = _clean_name(props.get("name", ""))
        if not name:
            continue
        is_dc  = (sid in dc_sids) or ("dc" in name and bool(props.get("operatingsystem", "")))
        priv   = "Domain Controller" if is_dc else ""
        ntype  = "Server" if is_dc else "Computer"
        domain = props.get("domain", "").lower()
        subnet = subnet_lookup.get(domain, "")
        if is_dc:
            dc_names.add(name)
        _add_node(sid, name, ntype, priv, is_dc, subnet)

    # Pass 3: Build edges
    edges:   list[dict] = []
    edge_id: int        = 0

    def _eid() -> str:
        nonlocal edge_id
        edge_id += 1
        return f"E{edge_id:04d}"

    def _add_edge(src: str, tgt: str, relation: str) -> None:
        if src and tgt and src != tgt and src in node_set and tgt in node_set:
            edges.append({
                "id":       _eid(),
                "source":   src,
                "target":   tgt,
                "relation": relation,
                "weight":   DEFAULT_WEIGHTS.get(relation, 5),
            })

    def _resolve(sid: str) -> str:
        return sid_name.get(sid, "")

    # Users → ACEs on users, sessions, primary group
    for obj in type_data.get("users", []):
        props   = obj.get("Properties", {})
        name    = _clean_name(props.get("name", ""))
        if not name:
            continue
        # ACEs: other principals have rights over THIS user
        for ace in obj.get("Aces", []):
            src  = _resolve(ace.get("PrincipalSID", ""))
            rel  = _ACE_MAP.get(ace.get("RightName", ""))
            if src and rel and not ace.get("IsInherited", False):
                _add_edge(src, name, rel)
        # Primary group membership
        pg_sid = obj.get("PrimaryGroupSid", "")
        if pg_sid:
            grp = _resolve(pg_sid)
            if grp:
                _add_edge(name, grp, "MemberOf")
        # AllowedToDelegate
        for ref in obj.get("AllowedToDelegate", []):
            tgt = _resolve(ref.get("ObjectIdentifier", ref)) if isinstance(ref, dict) else _resolve(ref)
            if tgt:
                _add_edge(name, tgt, "CanRDP")

    # Groups → Members (MemberOf) + ACEs on groups
    for obj in type_data.get("groups", []):
        props    = obj.get("Properties", {})
        grp_name = _clean_name(props.get("name", ""))
        if not grp_name:
            continue
        for member in obj.get("Members", []):
            src = _resolve(member.get("ObjectIdentifier", ""))
            if src:
                _add_edge(src, grp_name, "MemberOf")
        for ace in obj.get("Aces", []):
            src = _resolve(ace.get("PrincipalSID", ""))
            rel = _ACE_MAP.get(ace.get("RightName", ""))
            if src and rel and not ace.get("IsInherited", False):
                _add_edge(src, grp_name, rel)

    # Computers → LocalAdmins (AdminTo), RDP users, Sessions, ACEs
    for obj in type_data.get("computers", []):
        props      = obj.get("Properties", {})
        comp_name  = _clean_name(props.get("name", ""))
        if not comp_name:
            continue

        for adm in (obj.get("LocalAdmins") or {}).get("Results", []):
            src = _resolve(adm.get("ObjectIdentifier", ""))
            if src:
                _add_edge(src, comp_name, "AdminTo")

        for rdp in (obj.get("RemoteDesktopUsers") or {}).get("Results", []):
            src = _resolve(rdp.get("ObjectIdentifier", ""))
            if src:
                _add_edge(src, comp_name, "CanRDP")

        for sess in (obj.get("Sessions") or {}).get("Results", []):
            usr = _resolve(sess.get("ObjectIdentifier", ""))
            if usr:
                _add_edge(comp_name, usr, "HasSession")

        # Privileged sessions (more reliable than Sessions)
        for sess in (obj.get("PrivilegedSessions") or {}).get("Results", []):
            usr = _resolve(sess.get("ObjectIdentifier", ""))
            if usr:
                _add_edge(comp_name, usr, "HasSession")

        for ace in obj.get("Aces", []):
            src = _resolve(ace.get("PrincipalSID", ""))
            rel = _ACE_MAP.get(ace.get("RightName", ""))
            if src and rel and not ace.get("IsInherited", False):
                _add_edge(src, comp_name, rel)

    # Domains → ACEs (DCSync rights usually live here)
    for obj in type_data.get("domains", []):
        for ace in obj.get("Aces", []):
            src = _resolve(ace.get("PrincipalSID", ""))
            rel = _ACE_MAP.get(ace.get("RightName", ""))
            if src and rel and not ace.get("IsInherited", False):
                # Target the DC for domain-level ACEs
                for dc in dc_names:
                    _add_edge(src, dc, rel)
                    break   # one edge per ACE is enough

    # Pass 4: Prune orphan edges, build metadata
    edges = [e for e in edges if e["source"] in node_set and e["target"] in node_set]

    edge_sources = {e["source"] for e in edges}
    start_options = [
        n["name"] for n in nodes
        if n["type"] == "User"
        and n["privilegeLevel"] == "Low"
        and n["name"] in edge_sources
    ][:4]

    # Critical edge: first DCSync or GenericAll on a DC
    crit_id = ""
    for e in edges:
        if e["relation"] in ("DCSync", "GenericAll") and any(
            n["name"] == e["target"] and n.get("highValue") for n in nodes
        ):
            crit_id = e["id"]
            break

    return {
        "weights":         dict(DEFAULT_WEIGHTS),
        "subnets":         subnets,
        "nodes":           nodes,
        "edges":           edges,
        "criticalEdgeId":  crit_id,
        "startOptions":    start_options,
        "scenarioPresets": {},
    }
