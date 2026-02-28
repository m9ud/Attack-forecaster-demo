# Attack Path Forecaster — Demo Dataset

## Scenario-Based Risk Simulation Engine

---

## 1) Node List

### Users (14)

| ID   | Node Name         | Type  | Privilege Level   | Notes              |
|------|-------------------|-------|-------------------|--------------------|
| U01  | User_LowPriv1     | User  | Low               | Entry point        |
| U02  | User_LowPriv2     | User  | Low               | Entry point        |
| U03  | User_LowPriv3     | User  | Low               | Entry point        |
| U04  | User_LowPriv4     | User  | Low               | Entry point        |
| U05  | User_HelpDesk1    | User  | Mid-Low           | Help desk staff    |
| U06  | User_HelpDesk2    | User  | Mid-Low           | Help desk staff    |
| U07  | User_ITAdmin1     | User  | Mid-High          | IT operations      |
| U08  | User_ITAdmin2     | User  | Mid-High          | IT operations      |
| U09  | User_SvcAccount1  | User  | Service           | Overprivileged SA  |
| U10  | User_SvcAccount2  | User  | Service           | DB service account |
| U11  | User_DevOps1      | User  | Mid               | DevOps engineer    |
| U12  | User_DBAdmin1     | User  | Mid               | Database admin     |
| U13  | User_MidPriv1     | User  | Mid               | General IT staff   |
| U14  | **Domain_Admin**  | User  | **Domain Admin**  | ★ HIGH VALUE       |

### Groups (7)

| ID   | Node Name          | Type  | Notes                        |
|------|--------------------|-------|------------------------------|
| G01  | GRP_HelpDesk       | Group | Workstation admin delegation  |
| G02  | GRP_ITOps          | Group | IT operations team            |
| G03  | GRP_ServerAdmins   | Group | Server administration         |
| G04  | GRP_DBATeam        | Group | Database administration       |
| G05  | GRP_DevOps         | Group | Build/deploy pipeline         |
| G06  | GRP_DomainAdmins   | Group | ★ Domain-level control        |
| G07  | GRP_RemoteAccess   | Group | Remote desktop delegation     |

### Computers / Servers (10)

| ID   | Node Name          | Type     | Notes                      |
|------|---------------------|----------|----------------------------|
| C01  | WS_Workstation01    | Computer | End-user workstation       |
| C02  | WS_Workstation02    | Computer | End-user workstation       |
| C03  | WS_Workstation03    | Computer | End-user workstation       |
| C04  | SRV_FileServer      | Server   | File share services        |
| C05  | SRV_WebServer       | Server   | Internal web applications  |
| C06  | SRV_DBServer        | Server   | Production database        |
| C07  | SRV_AppServer       | Server   | Line-of-business app       |
| C08  | SRV_BuildServer     | Server   | CI/CD pipeline             |
| C09  | SRV_BackupServer    | Server   | Backup infrastructure      |
| C10  | **DC01**            | Server   | ★ DOMAIN CONTROLLER        |

### Summary

| Category       | Count |
|----------------|-------|
| Users          | 14    |
| Groups         | 7     |
| Computers      | 10    |
| **Total Nodes**| **31**|
| High Value Targets | 2 (DC01, Domain_Admin) |

---

## 2) Edge List

**Total Edges: 100**

### MemberOf — 19 edges (weight = 3)

| Edge  | Source             | Relation | Target             |
|-------|--------------------|----------|--------------------|
| E001  | User_LowPriv1      | MemberOf | GRP_HelpDesk       |
| E002  | User_LowPriv2      | MemberOf | GRP_RemoteAccess   |
| E003  | User_LowPriv3      | MemberOf | GRP_RemoteAccess   |
| E004  | User_LowPriv4      | MemberOf | GRP_HelpDesk       |
| E005  | User_LowPriv4      | MemberOf | GRP_RemoteAccess   |
| E006  | User_HelpDesk1     | MemberOf | GRP_HelpDesk       |
| E007  | User_HelpDesk1     | MemberOf | GRP_RemoteAccess   |
| E008  | User_HelpDesk2     | MemberOf | GRP_HelpDesk       |
| E009  | User_ITAdmin1      | MemberOf | GRP_ITOps          |
| E010  | User_ITAdmin2      | MemberOf | GRP_ITOps          |
| E011  | User_ITAdmin1      | MemberOf | GRP_ServerAdmins   |
| E012  | User_ITAdmin2      | MemberOf | GRP_ServerAdmins   |
| E013  | User_SvcAccount1   | MemberOf | GRP_ITOps          |
| E014  | User_SvcAccount2   | MemberOf | GRP_DBATeam        |
| E015  | User_DevOps1       | MemberOf | GRP_DevOps         |
| E016  | User_DBAdmin1      | MemberOf | GRP_DBATeam        |
| E017  | User_MidPriv1      | MemberOf | GRP_RemoteAccess   |
| E018  | User_MidPriv1      | MemberOf | GRP_HelpDesk       |
| E019  | Domain_Admin       | MemberOf | GRP_DomainAdmins   |

### AdminTo — 27 edges (weight = 7)

| Edge  | Source             | Relation | Target             |
|-------|--------------------|----------|--------------------|
| E020  | GRP_HelpDesk       | AdminTo  | WS_Workstation01   |
| E021  | GRP_HelpDesk       | AdminTo  | WS_Workstation02   |
| E022  | GRP_HelpDesk       | AdminTo  | WS_Workstation03   |
| E023  | GRP_ITOps          | AdminTo  | SRV_FileServer     |
| E024  | GRP_ITOps          | AdminTo  | SRV_WebServer      |
| E025  | GRP_ServerAdmins   | AdminTo  | SRV_AppServer      |
| E026  | GRP_ServerAdmins   | AdminTo  | SRV_DBServer       |
| E027  | GRP_ServerAdmins   | AdminTo  | SRV_BackupServer   |
| E028  | GRP_ServerAdmins   | AdminTo  | DC01               |
| E029  | GRP_DBATeam        | AdminTo  | SRV_DBServer       |
| E030  | GRP_DevOps         | AdminTo  | SRV_BuildServer    |
| E031  | GRP_DevOps         | AdminTo  | SRV_AppServer      |
| E032  | GRP_DomainAdmins   | AdminTo  | DC01               |
| E033  | GRP_DomainAdmins   | AdminTo  | SRV_FileServer     |
| E034  | GRP_DomainAdmins   | AdminTo  | SRV_WebServer      |
| E035  | GRP_DomainAdmins   | AdminTo  | SRV_AppServer      |
| E036  | GRP_DomainAdmins   | AdminTo  | SRV_DBServer       |
| E037  | GRP_DomainAdmins   | AdminTo  | SRV_BuildServer    |
| E038  | GRP_DomainAdmins   | AdminTo  | SRV_BackupServer   |
| E039  | User_ITAdmin1      | AdminTo  | SRV_FileServer     |
| E040  | User_ITAdmin2      | AdminTo  | SRV_AppServer      |
| E041  | User_DBAdmin1      | AdminTo  | SRV_DBServer       |
| E042  | Domain_Admin       | AdminTo  | DC01               |
| E043  | User_HelpDesk1     | AdminTo  | WS_Workstation01   |
| E044  | User_MidPriv1      | AdminTo  | WS_Workstation02   |
| E045  | User_SvcAccount1   | AdminTo  | SRV_WebServer      |
| E046  | User_SvcAccount2   | AdminTo  | SRV_FileServer     |

### HasSession — 23 edges (weight = 6)

| Edge  | Source             | Relation    | Target             |
|-------|--------------------|-------------|--------------------|
| E047  | WS_Workstation01   | HasSession  | User_LowPriv1      |
| E048  | WS_Workstation01   | HasSession  | User_LowPriv4      |
| E049  | WS_Workstation01   | HasSession  | User_MidPriv1      |
| E050  | WS_Workstation02   | HasSession  | User_LowPriv2      |
| E051  | WS_Workstation02   | HasSession  | User_HelpDesk1     |
| E052  | WS_Workstation02   | HasSession  | User_MidPriv1      |
| E053  | WS_Workstation03   | HasSession  | User_HelpDesk2     |
| E054  | WS_Workstation03   | HasSession  | User_ITAdmin2      |
| E055  | SRV_FileServer     | HasSession  | User_ITAdmin1      |
| E056  | SRV_FileServer     | HasSession  | User_SvcAccount2   |
| E057  | SRV_FileServer     | HasSession  | User_HelpDesk1     |
| E058  | SRV_WebServer      | HasSession  | User_DevOps1       |
| E059  | SRV_WebServer      | HasSession  | User_MidPriv1      |
| E060  | SRV_WebServer      | HasSession  | User_SvcAccount1   |
| E061  | SRV_AppServer      | HasSession  | User_SvcAccount1   |
| E062  | SRV_AppServer      | HasSession  | User_ITAdmin2      |
| E063  | SRV_AppServer      | HasSession  | User_MidPriv1      |
| E064  | SRV_DBServer       | HasSession  | User_DBAdmin1      |
| E065  | SRV_DBServer       | HasSession  | User_SvcAccount2   |
| E066  | SRV_BuildServer    | HasSession  | Domain_Admin       |
| E067  | SRV_BuildServer    | HasSession  | User_DevOps1       |
| E068  | SRV_BackupServer   | HasSession  | User_SvcAccount1   |
| E069  | SRV_BackupServer   | HasSession  | User_ITAdmin1      |

### CanRDP — 20 edges (weight = 5)

| Edge  | Source             | Relation | Target             |
|-------|--------------------|----------|--------------------|
| E070  | User_LowPriv1      | CanRDP   | WS_Workstation01   |
| E071  | User_LowPriv1      | CanRDP   | WS_Workstation02   |
| E072  | User_LowPriv2      | CanRDP   | WS_Workstation02   |
| E073  | User_LowPriv2      | CanRDP   | WS_Workstation03   |
| E074  | User_LowPriv3      | CanRDP   | WS_Workstation03   |
| E075  | User_LowPriv4      | CanRDP   | WS_Workstation01   |
| E076  | User_LowPriv4      | CanRDP   | WS_Workstation02   |
| E077  | User_HelpDesk1     | CanRDP   | SRV_FileServer     |
| E078  | User_HelpDesk1     | CanRDP   | WS_Workstation03   |
| E079  | User_HelpDesk2     | CanRDP   | SRV_FileServer     |
| E080  | User_HelpDesk2     | CanRDP   | WS_Workstation03   |
| E081  | User_MidPriv1      | CanRDP   | SRV_WebServer      |
| E082  | User_MidPriv1      | CanRDP   | SRV_AppServer      |
| E083  | GRP_RemoteAccess   | CanRDP   | SRV_WebServer      |
| E084  | GRP_RemoteAccess   | CanRDP   | SRV_FileServer     |
| E085  | GRP_RemoteAccess   | CanRDP   | SRV_AppServer      |
| E086  | User_DevOps1       | CanRDP   | SRV_BuildServer    |
| E087  | User_ITAdmin1      | CanRDP   | SRV_BackupServer   |
| E088  | User_ITAdmin2      | CanRDP   | SRV_AppServer      |
| E089  | GRP_DBATeam        | CanRDP   | SRV_DBServer       |

### GenericAll — 4 edges (weight = 9)

| Edge  | Source             | Relation   | Target             | Notes          |
|-------|--------------------|------------|--------------------|----------------|
| E090  | User_SvcAccount1   | GenericAll | GRP_DomainAdmins   | ★ **CRITICAL** |
| E091  | User_MidPriv1      | GenericAll | User_SvcAccount2   |                |
| E092  | User_DevOps1       | GenericAll | SRV_AppServer      |                |
| E093  | User_ITAdmin1      | GenericAll | SRV_DBServer       |                |

### WriteDACL — 7 edges (weight = 8)

| Edge  | Source             | Relation  | Target             |
|-------|--------------------|-----------|---------------------|
| E094  | User_LowPriv1      | WriteDACL | GRP_ITOps          |
| E095  | User_HelpDesk2     | WriteDACL | GRP_RemoteAccess   |
| E096  | User_LowPriv4      | WriteDACL | User_HelpDesk2     |
| E097  | User_DBAdmin1      | WriteDACL | SRV_BackupServer   |
| E098  | User_LowPriv2      | WriteDACL | User_MidPriv1      |
| E099  | User_DevOps1       | WriteDACL | User_SvcAccount1   |
| E100  | User_LowPriv3      | WriteDACL | User_HelpDesk1     |

### Edge Distribution Summary

| Relation   | Count | Weight |
|------------|-------|--------|
| MemberOf   | 19    | 3      |
| AdminTo    | 27    | 7      |
| HasSession | 23    | 6      |
| CanRDP     | 20    | 5      |
| GenericAll | 4     | 9      |
| WriteDACL  | 7     | 8      |
| **Total**  | **100** |      |

---

## 3) Baseline Analysis

### Attack Path Enumeration

All discovered attack paths from low-privilege users (U01–U04) to **DC01** within depth 4–7:

#### Chain A — ACL Abuse (from User_LowPriv1)

| Path | Hops | Route | Edge Types | Through Critical |
|------|------|-------|------------|------------------|
| A1 | 5 | LowPriv1 → GRP_ITOps → SRV_FileServer → ITAdmin1 → GRP_ServerAdmins → DC01 | WriteDACL → AdminTo → HasSession → MemberOf → AdminTo | No |
| A2 | 5 | LowPriv1 → GRP_ITOps → SRV_WebServer → SvcAccount1 → GRP_DomainAdmins → DC01 | WriteDACL → AdminTo → HasSession → GenericAll → AdminTo | **Yes** |
| A3 | 6 | LowPriv1 → WS02 → MidPriv1 → SRV_WebServer → SvcAccount1 → GRP_DomainAdmins → DC01 | CanRDP → HasSession → CanRDP → HasSession → GenericAll → AdminTo | **Yes** |

#### Chain B — Lateral Movement (from User_LowPriv2)

| Path | Hops | Route | Edge Types | Through Critical |
|------|------|-------|------------|------------------|
| B3 | 5 | LowPriv2 → MidPriv1 → SRV_WebServer → SvcAccount1 → GRP_DomainAdmins → DC01 | WriteDACL → CanRDP → HasSession → GenericAll → AdminTo | **Yes** |
| B4 | 5 | LowPriv2 → MidPriv1 → SRV_AppServer → SvcAccount1 → GRP_DomainAdmins → DC01 | WriteDACL → CanRDP → HasSession → GenericAll → AdminTo | **Yes** |
| B5 | 4 | LowPriv2 → WS03 → ITAdmin2 → GRP_ServerAdmins → DC01 | CanRDP → HasSession → MemberOf → AdminTo | No |
| B6 | 6 | LowPriv2 → GRP_RemoteAccess → SRV_WebServer → SvcAccount1 → GRP_DomainAdmins → DC01 | MemberOf → CanRDP → HasSession → GenericAll → AdminTo | **Yes** |
| B7 | 6 | LowPriv2 → GRP_RemoteAccess → SRV_AppServer → SvcAccount1 → GRP_DomainAdmins → DC01 | MemberOf → CanRDP → HasSession → GenericAll → AdminTo | **Yes** |

#### Chain C — Session-Based Escalation (from User_LowPriv3)

| Path | Hops | Route | Edge Types | Through Critical |
|------|------|-------|------------|------------------|
| C1 | 6 | LowPriv3 → GRP_RemoteAccess → SRV_WebServer → SvcAccount1 → GRP_DomainAdmins → DC01 | MemberOf → CanRDP → HasSession → GenericAll → AdminTo | **Yes** |
| C3 | 6 | LowPriv3 → GRP_RemoteAccess → SRV_AppServer → SvcAccount1 → GRP_DomainAdmins → DC01 | MemberOf → CanRDP → HasSession → GenericAll → AdminTo | **Yes** |
| C4 | 4 | LowPriv3 → WS03 → ITAdmin2 → GRP_ServerAdmins → DC01 | CanRDP → HasSession → MemberOf → AdminTo | No |
| C5 | 5 | LowPriv3 → HelpDesk1 → SRV_FileServer → ITAdmin1 → GRP_ServerAdmins → DC01 | WriteDACL → CanRDP → HasSession → MemberOf → AdminTo | No |

#### Chain D — Mixed Escalation (from User_LowPriv4)

| Path | Hops | Route | Edge Types | Through Critical |
|------|------|-------|------------|------------------|
| D1 | 5 | LowPriv4 → HelpDesk2 → SRV_FileServer → ITAdmin1 → GRP_ServerAdmins → DC01 | WriteDACL → CanRDP → HasSession → MemberOf → AdminTo | No |
| D2 | 6 | LowPriv4 → WS01 → MidPriv1 → SRV_WebServer → SvcAccount1 → GRP_DomainAdmins → DC01 | CanRDP → HasSession → CanRDP → HasSession → GenericAll → AdminTo | **Yes** |
| D3 | 6 | LowPriv4 → WS01 → MidPriv1 → SRV_AppServer → SvcAccount1 → GRP_DomainAdmins → DC01 | CanRDP → HasSession → CanRDP → HasSession → GenericAll → AdminTo | **Yes** |
| D4 | 6 | LowPriv4 → WS02 → HelpDesk1 → SRV_FileServer → ITAdmin1 → GRP_ServerAdmins → DC01 | CanRDP → HasSession → CanRDP → HasSession → MemberOf → AdminTo | No |
| D5 | 6 | LowPriv4 → GRP_RemoteAccess → SRV_WebServer → SvcAccount1 → GRP_DomainAdmins → DC01 | MemberOf → CanRDP → HasSession → GenericAll → AdminTo | **Yes** |
| D6 | 6 | LowPriv4 → GRP_RemoteAccess → SRV_AppServer → SvcAccount1 → GRP_DomainAdmins → DC01 | MemberOf → CanRDP → HasSession → GenericAll → AdminTo | **Yes** |

### Baseline Metrics

| Metric                         | Value    |
|--------------------------------|----------|
| Total Attack Paths to DC01     | **18**   |
| Paths through critical edge E090 | 12     |
| Paths NOT through critical edge  | 6      |
| Shortest path length           | **4 hops** (B5, C4) |
| Longest path length            | 6 hops   |
| High Value Targets reachable   | 2 (DC01, Domain_Admin) |
| Global Risk Score              | **241.78** |

### Risk Score per Path

Formula: `Risk(path) = Σ(edge_weights) / √(path_length)`

| Path | Hops | Edge Weights Sum | Risk Score | Rank |
|------|------|------------------|------------|------|
| A2★  | 5    | 8+7+6+9+7 = 37   | **16.55**  | 1    |
| B3★  | 5    | 8+5+6+9+7 = 35   | **15.65**  | 2    |
| B4★  | 5    | 8+5+6+9+7 = 35   | **15.65**  | 3    |
| A3★  | 6    | 5+6+5+6+9+7 = 38 | **15.52**  | 4    |
| D2★  | 6    | 5+6+5+6+9+7 = 38 | **15.52**  | 5    |
| D3★  | 6    | 5+6+5+6+9+7 = 38 | 15.52      | 6    |
| A1   | 5    | 8+7+6+3+7 = 31   | 13.86      | 7    |
| D4   | 6    | 5+6+5+6+3+7 = 32 | 13.07      | 8    |
| C5   | 5    | 8+5+6+3+7 = 29   | 12.97      | 9    |
| D1   | 5    | 8+5+6+3+7 = 29   | 12.97      | 10   |
| B6★  | 6    | 3+5+6+9+7 = 30   | 12.25      | 11   |
| B7★  | 6    | 3+5+6+9+7 = 30   | 12.25      | 12   |
| C1★  | 6    | 3+5+6+9+7 = 30   | 12.25      | 13   |
| C3★  | 6    | 3+5+6+9+7 = 30   | 12.25      | 14   |
| D5★  | 6    | 3+5+6+9+7 = 30   | 12.25      | 15   |
| D6★  | 6    | 3+5+6+9+7 = 30   | 12.25      | 16   |
| B5   | 4    | 5+6+3+7 = 21     | 10.50      | 17   |
| C4   | 4    | 5+6+3+7 = 21     | 10.50      | 18   |

### Top 5 Highest Risk Paths

1. **A2** — LowPriv1 via ACL abuse through GRP_ITOps to SvcAccount1 → GenericAll → DomainAdmins (Risk: **16.55**)
2. **B3** — LowPriv2 via WriteDACL on MidPriv1 → lateral to WebServer → SvcAccount1 (Risk: **15.65**)
3. **B4** — LowPriv2 via WriteDACL on MidPriv1 → lateral to AppServer → SvcAccount1 (Risk: **15.65**)
4. **A3** — LowPriv1 via session hijack through WS02 → MidPriv1 → WebServer → SvcAccount1 (Risk: **15.52**)
5. **D2** — LowPriv4 via session hijack through WS01 → MidPriv1 → WebServer → SvcAccount1 (Risk: **15.52**)

### Critical Edge Identified

> **E090: User_SvcAccount1 → GenericAll → GRP_DomainAdmins**
>
> This single edge is traversed by **12 of 18 paths (66.7%)**.
> It is the primary bottleneck enabling low-privilege users to reach DC01
> through the GRP_DomainAdmins gateway.

---

## 4) What-If Scenarios

---

### Scenario A: Remove Critical GenericAll Edge (E090)

**Action:** Remove `User_SvcAccount1 → GenericAll → GRP_DomainAdmins`

**Rationale:** Revoke the overprivileged GenericAll ACE that the service account
holds on the Domain Admins group. This is the #1 single-point-of-failure edge.

#### Before vs After

| Metric                    | Before    | After     | Delta       |
|---------------------------|-----------|-----------|-------------|
| Total Attack Paths        | 18        | 6         | −12 paths   |
| Paths through DomainAdmins| 12        | 0         | −12 paths   |
| Global Risk Score         | 241.78    | 73.87     | −167.91     |
| **Risk Reduction**        |           |           | **69.4%**   |
| HVTs Reachable            | 2         | 2         | No change   |
| Shortest Path             | 4 hops    | 4 hops    | No change   |

#### Surviving Paths (6)

| Path | Hops | Route | Risk  |
|------|------|-------|-------|
| A1   | 5    | LowPriv1 → GRP_ITOps → SRV_FileServer → ITAdmin1 → GRP_ServerAdmins → DC01 | 13.86 |
| B5   | 4    | LowPriv2 → WS03 → ITAdmin2 → GRP_ServerAdmins → DC01 | 10.50 |
| C4   | 4    | LowPriv3 → WS03 → ITAdmin2 → GRP_ServerAdmins → DC01 | 10.50 |
| C5   | 5    | LowPriv3 → HelpDesk1 → SRV_FileServer → ITAdmin1 → GRP_ServerAdmins → DC01 | 12.97 |
| D1   | 5    | LowPriv4 → HelpDesk2 → SRV_FileServer → ITAdmin1 → GRP_ServerAdmins → DC01 | 12.97 |
| D4   | 6    | LowPriv4 → WS02 → HelpDesk1 → SRV_FileServer → ITAdmin1 → GRP_ServerAdmins → DC01 | 13.07 |

#### Explanation

Removing this single GenericAll ACE severs the connection between the
overprivileged service account and the Domain Admins group. All 12 attack
paths that relied on escalating through GRP_DomainAdmins are eliminated.
The remaining 6 paths all converge through GRP_ServerAdmins → DC01 via
ITAdmin1 or ITAdmin2, representing a significantly smaller and more
controllable attack surface.

---

### Scenario B: Disable Mid-Level User (User_MidPriv1)

**Action:** Disable the `User_MidPriv1` account (remove all inbound and outbound edges).

**Rationale:** User_MidPriv1 is a convergence point — reachable via session
hijacking on multiple workstations, and holds CanRDP access to critical
servers (SRV_WebServer, SRV_AppServer). Simulates disabling a compromised
or overprivileged account.

#### Before vs After

| Metric                    | Before    | After     | Delta       |
|---------------------------|-----------|-----------|-------------|
| Total Attack Paths        | 18        | 13        | −5 paths    |
| Global Risk Score         | 241.78    | 163.92    | −77.86      |
| **Risk Reduction**        |           |           | **32.2%**   |
| HVTs Reachable            | 2         | 2         | No change   |
| Shortest Path             | 4 hops    | 4 hops    | No change   |

#### Eliminated Paths (5)

| Path | Reason |
|------|--------|
| A3   | Traversed MidPriv1 via WS02 HasSession |
| B3   | Traversed MidPriv1 via WriteDACL from LowPriv2 |
| B4   | Traversed MidPriv1 via WriteDACL from LowPriv2 |
| D2   | Traversed MidPriv1 via WS01 HasSession |
| D3   | Traversed MidPriv1 via WS01 HasSession |

#### Explanation

User_MidPriv1 serves as a stepping stone in 5 paths. Disabling this account
removes the bridge between workstation-level session compromise and server-level
CanRDP access. However, the critical E090 edge remains intact, so 7 other
paths through GRP_DomainAdmins survive via GRP_RemoteAccess group membership.
Impact is moderate — meaningful but insufficient as a standalone fix.

---

### Scenario C: Remove Non-Critical WriteDACL Edge (E100) — False Fix

**Action:** Remove `User_LowPriv3 → WriteDACL → User_HelpDesk1`

**Rationale:** This edge appears dangerous because it is a WriteDACL
relationship from a low-privilege user. However, its removal has
negligible security impact.

#### Before vs After

| Metric                    | Before    | After     | Delta       |
|---------------------------|-----------|-----------|-------------|
| Total Attack Paths        | 18        | 17        | −1 path     |
| Global Risk Score         | 241.78    | 228.81    | −12.97      |
| **Risk Reduction**        |           |           | **5.4%**    |
| HVTs Reachable            | 2         | 2         | No change   |
| Shortest Path             | 4 hops    | 4 hops    | No change   |

#### Eliminated Path (1)

| Path | Route |
|------|-------|
| C5   | LowPriv3 → HelpDesk1 → SRV_FileServer → ITAdmin1 → GRP_ServerAdmins → DC01 |

#### Explanation

This is a **false remediation**. While WriteDACL from a low-privilege user
looks alarming in isolation, User_LowPriv3 retains two higher-risk paths
(C1, C3) through GRP_RemoteAccess → SRV_WebServer/SRV_AppServer →
SvcAccount1 → GRP_DomainAdmins → DC01. The removed edge only affected
one redundant path through GRP_ServerAdmins. The attacker still has
multiple viable escalation routes. This scenario demonstrates why
edge-level triage without path-level context leads to wasted remediation effort.

---

## 5) What-If Scenario Comparison Matrix

| Metric              | Baseline | Scenario A (E090) | Scenario B (MidPriv1) | Scenario C (E100) |
|----------------------|----------|--------------------|-----------------------|---------------------|
| Attack Paths         | 18       | 6                  | 13                    | 17                  |
| Risk Score           | 241.78   | 73.87              | 163.92                | 228.81              |
| % Reduction          | —        | **69.4%**          | **32.2%**             | **5.4%**            |
| HVTs Reachable       | 2        | 2                  | 2                     | 2                   |
| Shortest Path        | 4        | 4                  | 4                     | 4                   |
| Remediation Priority | —        | ★ CRITICAL         | ◆ MODERATE            | ○ LOW / FALSE FIX   |

---

## 6) Explanation Engine Output

### Full Attack Chain Walkthrough — Path A2 (Highest Risk: 16.55)

**Technique Category:** ACL Abuse → Credential Extraction → Domain Escalation

```
STEP 1: User_LowPriv1
         │
         │ has WriteDACL on GRP_ITOps [E094]
         │ → Can modify the Discretionary Access Control List
         │ → Grants self GenericAll permission on the group
         │ → Adds self as member of GRP_ITOps
         ▼
STEP 2: GRP_ITOps
         │
         │ has AdminTo on SRV_WebServer [E024]
         │ → As a member of GRP_ITOps, gains local administrator
         │   privileges on SRV_WebServer
         ▼
STEP 3: SRV_WebServer
         │
         │ HasSession of User_SvcAccount1 [E060]
         │ → Local admin can extract credentials from memory
         │ → Obtains NTLM hash or Kerberos ticket of SvcAccount1
         ▼
STEP 4: User_SvcAccount1
         │
         │ has GenericAll on GRP_DomainAdmins [E090] ★ CRITICAL EDGE
         │ → GenericAll = full control over the object
         │ → Can modify group membership
         │ → Adds self (or controlled identity) to GRP_DomainAdmins
         ▼
STEP 5: GRP_DomainAdmins
         │
         │ has AdminTo on DC01 [E032]
         │ → Member of Domain Admins has administrative access
         │   to the Domain Controller
         │ → FULL DOMAIN COMPROMISE
         ▼
RESULT:  DC01 — Domain Controller Compromised
```

### Risk Breakdown

| Step | Edge | Relation   | Weight | Cumulative |
|------|------|------------|--------|------------|
| 1    | E094 | WriteDACL  | 8      | 8          |
| 2    | E024 | AdminTo    | 7      | 15         |
| 3    | E060 | HasSession | 6      | 21         |
| 4    | E090 | GenericAll | 9      | 30         |
| 5    | E032 | AdminTo    | 7      | 37         |
| **Total** | | | **37** | Risk = 37 / √5 = **16.55** |

### Why This Path Is Critical

1. **Entry barrier is low** — WriteDACL on a group is often granted through
   misconfigured delegation and rarely audited
2. **GenericAll on Domain Admins (E090)** is the single most dangerous
   permission in this graph — it provides a one-hop escalation to
   domain-level control
3. **Service account sessions persist** — SvcAccount1 maintains a long-lived
   session on SRV_WebServer, providing a reliable credential extraction target
4. **Removing E090 alone eliminates this path AND 11 others** (69.4% risk reduction)

---

## Appendix: Graph Gateways to DC01

Three independent gateways exist to reach the Domain Controller:

```
Gateway 1: GRP_ServerAdmins ──[AdminTo E028]──► DC01
            ▲
            │ MemberOf: ITAdmin1 [E011], ITAdmin2 [E012]

Gateway 2: GRP_DomainAdmins ──[AdminTo E032]──► DC01
            ▲
            │ GenericAll: SvcAccount1 [E090] ★ CRITICAL BOTTLENECK
            │ MemberOf: Domain_Admin [E019]

Gateway 3: Domain_Admin ──[AdminTo E042]──► DC01
            ▲
            │ HasSession on: SRV_BuildServer [E066]
```

**Key Insight:** Gateway 2 carries 66.7% of all attack traffic due to the
overprivileged service account. Securing E090 forces all remaining attacks
through Gateway 1 (which requires compromising ITAdmin1 or ITAdmin2 directly).
