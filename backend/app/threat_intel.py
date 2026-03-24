"""
Threat Intelligence Feed — realistic mock CVE/NVD data keyed by node type.
In a production deployment this module would query the NVD REST API v2.0.
Cache TTL: 24 hours (simulated via lastUpdated field).
"""

from __future__ import annotations
from datetime import datetime

# ── Mock CVE database ────────────────────────────────────────────────────────
_CVE_DB: dict[str, list[dict]] = {
    "domain_controller": [
        {
            "cveId": "CVE-2020-1472",
            "severity": "Critical",
            "cvssScore": 10.0,
            "description": (
                "Zerologon — Unauthenticated privilege escalation via NetLogon flaw. "
                "Allows instant Domain Controller compromise with zero credentials."
            ),
            "affectedSoftware": "Windows Server AD Netlogon",
            "exploitAvailable": True,
            "patchAvailable": True,
            "publishedDate": "2020-08-11",
        },
        {
            "cveId": "CVE-2021-34527",
            "severity": "Critical",
            "cvssScore": 8.8,
            "description": (
                "PrintNightmare — Windows Print Spooler RCE/LPE. "
                "Publicly available exploit allows SYSTEM-level code execution."
            ),
            "affectedSoftware": "Windows Print Spooler Service",
            "exploitAvailable": True,
            "patchAvailable": True,
            "publishedDate": "2021-07-01",
        },
        {
            "cveId": "CVE-2022-26923",
            "severity": "Critical",
            "cvssScore": 8.8,
            "description": (
                "AD CS Privilege Escalation via machine certificate enrollment "
                "(ESC8 / CertPotato). Allows domain privilege escalation."
            ),
            "affectedSoftware": "Active Directory Certificate Services",
            "exploitAvailable": True,
            "patchAvailable": True,
            "publishedDate": "2022-05-10",
        },
        {
            "cveId": "CVE-2021-42287",
            "severity": "High",
            "cvssScore": 7.5,
            "description": (
                "sAMAccountName Spoofing (noPac) — AD DS Elevation of Privilege "
                "allowing any domain user to impersonate a DC account."
            ),
            "affectedSoftware": "Windows Server AD DS",
            "exploitAvailable": True,
            "patchAvailable": True,
            "publishedDate": "2021-11-09",
        },
    ],
    "windows_server_2019": [
        {
            "cveId": "CVE-2024-21410",
            "severity": "Critical",
            "cvssScore": 9.8,
            "description": (
                "Microsoft Exchange Server Elevation of Privilege via NTLM relay. "
                "Actively exploited in the wild with public PoC available."
            ),
            "affectedSoftware": "Windows Server 2019 / Exchange Server",
            "exploitAvailable": True,
            "patchAvailable": True,
            "publishedDate": "2024-02-13",
        },
        {
            "cveId": "CVE-2024-26234",
            "severity": "High",
            "cvssScore": 7.8,
            "description": (
                "Windows Proxy Driver Spoofing allowing local privilege escalation "
                "to SYSTEM via signed malicious driver."
            ),
            "affectedSoftware": "Windows Server 2019",
            "exploitAvailable": True,
            "patchAvailable": True,
            "publishedDate": "2024-04-09",
        },
        {
            "cveId": "CVE-2023-44487",
            "severity": "High",
            "cvssScore": 7.5,
            "description": (
                "HTTP/2 Rapid Reset Attack — remote Denial of Service affecting "
                "IIS on Windows Server. Exploited at massive scale."
            ),
            "affectedSoftware": "Windows Server 2019 IIS",
            "exploitAvailable": True,
            "patchAvailable": True,
            "publishedDate": "2023-10-10",
        },
    ],
    "windows_server_2016": [
        {
            "cveId": "CVE-2021-42287",
            "severity": "High",
            "cvssScore": 7.5,
            "description": "noPac / sAMAccountName spoofing enabling any domain user to become DC.",
            "affectedSoftware": "Windows Server 2016 AD DS",
            "exploitAvailable": True,
            "patchAvailable": True,
            "publishedDate": "2021-11-09",
        },
        {
            "cveId": "CVE-2020-1472",
            "severity": "Critical",
            "cvssScore": 10.0,
            "description": "Zerologon — NetLogon Elevation of Privilege with instant DC compromise.",
            "affectedSoftware": "Windows Server 2016 Netlogon",
            "exploitAvailable": True,
            "patchAvailable": True,
            "publishedDate": "2020-08-11",
        },
        {
            "cveId": "CVE-2019-0708",
            "severity": "Critical",
            "cvssScore": 9.8,
            "description": (
                "BlueKeep — Wormable RCE via Remote Desktop Services. "
                "Pre-auth vulnerability requiring no credentials."
            ),
            "affectedSoftware": "Windows Server 2016 RDS",
            "exploitAvailable": True,
            "patchAvailable": True,
            "publishedDate": "2019-05-14",
        },
    ],
    "sql_server": [
        {
            "cveId": "CVE-2024-21331",
            "severity": "High",
            "cvssScore": 7.2,
            "description": (
                "SQL Server Native Client OLE DB Provider RCE. "
                "Exploitable when connecting to a malicious SQL Server."
            ),
            "affectedSoftware": "Microsoft SQL Server",
            "exploitAvailable": False,
            "patchAvailable": True,
            "publishedDate": "2024-01-09",
        },
        {
            "cveId": "CVE-2023-21528",
            "severity": "High",
            "cvssScore": 7.8,
            "description": (
                "Microsoft SQL Server Remote Code Execution via heap corruption "
                "in SQL Server Native Client."
            ),
            "affectedSoftware": "Microsoft SQL Server 2019/2022",
            "exploitAvailable": False,
            "patchAvailable": True,
            "publishedDate": "2023-02-14",
        },
    ],
    "workstation": [
        {
            "cveId": "CVE-2024-21412",
            "severity": "High",
            "cvssScore": 8.1,
            "description": (
                "Internet Shortcut Files security feature bypass — actively exploited "
                "by threat actors to deliver malware via spear-phishing."
            ),
            "affectedSoftware": "Windows 10/11",
            "exploitAvailable": True,
            "patchAvailable": True,
            "publishedDate": "2024-02-13",
        },
        {
            "cveId": "CVE-2023-36025",
            "severity": "High",
            "cvssScore": 8.8,
            "description": (
                "Windows SmartScreen security bypass via specially crafted .url files. "
                "Actively exploited in the wild."
            ),
            "affectedSoftware": "Windows 10/11 SmartScreen",
            "exploitAvailable": True,
            "patchAvailable": True,
            "publishedDate": "2023-11-14",
        },
        {
            "cveId": "CVE-2021-34484",
            "severity": "Medium",
            "cvssScore": 7.0,
            "description": (
                "Windows User Profile Service Elevation of Privilege — "
                "local privilege escalation to SYSTEM."
            ),
            "affectedSoftware": "Windows 10 User Profile Service",
            "exploitAvailable": True,
            "patchAvailable": True,
            "publishedDate": "2021-08-10",
        },
    ],
}

# ── Node → CVE category mapping ──────────────────────────────────────────────

def _categorize(node: dict) -> str | None:
    node_type = (node.get("type") or "").lower()
    priv = (node.get("privilegeLevel") or "").lower()
    name = (node.get("name") or "").lower()

    if "domain controller" in priv or node_type == "server" and any(
        k in name for k in ("dc", "kingslanding", "winterfell", "ads")
    ):
        return "domain_controller"
    if node_type == "server" and any(k in name for k in ("sql", "db", "database")):
        return "sql_server"
    if node_type == "server":
        # Alternate between 2016 and 2019 deterministically by name hash
        return "windows_server_2019" if sum(ord(c) for c in name) % 2 == 0 else "windows_server_2016"
    if node_type == "computer":
        return "workstation"
    return None


# ── Public API ───────────────────────────────────────────────────────────────

def get_threat_intel(nodes: list[dict]) -> dict[str, dict]:
    """
    Return CVE threat intel for a list of graph nodes.

    Returns:
        dict[nodeName -> {cves, totalCVEs, criticalCount, highCount,
                          exploitableCount, riskBoost, lastUpdated, category}]
    """
    results: dict[str, dict] = {}
    today = datetime.utcnow().strftime("%Y-%m-%d")

    for node in nodes:
        category = _categorize(node)
        if not category:
            continue
        cves = _CVE_DB.get(category, [])
        if not cves:
            continue

        critical_c = sum(1 for c in cves if c["severity"] == "Critical")
        high_c = sum(1 for c in cves if c["severity"] == "High")
        exploitable_c = sum(1 for c in cves if c.get("exploitAvailable"))
        risk_boost = round(critical_c * 0.30 + high_c * 0.15, 2)

        results[node["name"]] = {
            "cves": cves,
            "totalCVEs": len(cves),
            "criticalCount": critical_c,
            "highCount": high_c,
            "exploitableCount": exploitable_c,
            "riskBoost": risk_boost,
            "lastUpdated": today,
            "category": category,
            "nodeType": node.get("type", "Unknown"),
        }

    return results
