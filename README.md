# Attack Path Forecaster

A visual Active Directory attack path analysis platform. Upload a graph dataset, discover ranked attack paths, identify critical chokepoints, simulate defensive changes, and generate remediation reports.

## Architecture

```
Attack-forecaster-demo/
├── backend/
│   ├── requirements.txt
│   ├── run.py
│   └── app/
│       ├── main.py             # FastAPI application and all endpoints
│       ├── models.py           # Pydantic request/response schemas
│       ├── dataset.py          # Dataset loader (native JSON, GOAD, SharpHound ZIP)
│       ├── graph_engine.py     # NetworkX graph, path finding, risk scoring
│       ├── explainer.py        # Step-by-step attack chain breakdown
│       └── report_generator.py # Markdown report assembly
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx             # Root layout and tab routing
│       ├── App.css             # Global dark-theme styles
│       ├── api.js              # Backend fetch wrappers
│       ├── store.js            # Zustand global state
│       └── components/
│           ├── GraphView.jsx        # React Flow graph with Dagre layout
│           ├── AnalysisPanel.jsx    # Start node / target configuration
│           ├── ResultsPanel.jsx     # Ranked path results + explanation
│           ├── ScenarioPanel.jsx    # Pre-built what-if scenarios
│           ├── CriticalNodesPanel.jsx
│           ├── MitigationsPanel.jsx
│           ├── ReportPanel.jsx
│           ├── StatsCharts.jsx
│           ├── PathAnimationPlayer.jsx
│           ├── DatasetUpload.jsx
│           ├── ExplanationModal.jsx
│           ├── FilterPanel.jsx
│           ├── NodeContextMenu.jsx
│           ├── IconNode.jsx         # Custom graph node renderer
│           └── Icons.jsx            # SVG icon set
└── README.md
```

## Prerequisites

- **Python 3.11+** with `pip`
- **Node.js 18+** with `npm`

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python run.py
```

Runs on **http://localhost:8000**. API docs at **http://localhost:8000/docs**.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on **http://localhost:5173**.

### 3. Use the App

1. Open **http://localhost:5173** in a browser.
2. Upload a dataset JSON file (or use the default demo dataset via Reset).
3. Select start nodes and a target, then click **Analyze Attack Paths**.
4. Browse ranked paths, click a row to highlight it on the graph.
5. Click **Explain** on any path for a step-by-step breakdown.
6. Use the **Mitigate**, **Nodes**, and **Report** tabs for deeper analysis.

## Dataset Formats

The backend accepts three input formats:

| Format | Description |
|--------|-------------|
| Native JSON | `{ nodes, edges, weights, subnets, scenarioPresets }` |
| GOAD | Game of Active Directory lab config JSON |
| SharpHound ZIP | SharpHound collector output (`.zip` with per-type JSON files) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/graph` | All nodes and edges |
| GET | `/subnets` | Subnet definitions |
| GET | `/start-options` | Available start nodes |
| POST | `/neighbors` | Nodes within N hops of a given node |
| POST | `/analyze` | Bounded attack-path analysis |
| GET | `/explain` | Step-by-step explanation for a path |
| POST | `/simulate` | Before/after scenario comparison |
| GET | `/scenarios` | Pre-built scenario definitions |
| POST | `/upload-dataset` | Replace the active dataset |
| POST | `/reset-dataset` | Reset to bundled default dataset |
| GET | `/dataset-info` | Current dataset metadata |
| POST | `/critical-nodes` | Nodes ranked by betweenness centrality |
| POST | `/mitigations` | Rule-based remediation suggestions |
| POST | `/export` | Full structured JSON export |
| POST | `/report` | Markdown or JSON report generation |
| POST | `/roi-calculator` | Defense ROI per critical edge |
| POST | `/timeline` | Progressive risk reduction simulation |

## Risk Scoring

```
risk(path) = (Σ edge_weights + Σ privilege_bonuses)
             × (1 / √hops)
             × high_value_multiplier
             × critical_edge_bonus
             × exploit_ease_factor
             × stealth_factor
```

Default edge weights:

| Relation | Weight |
|----------|--------|
| DCSync | 10 |
| GenericAll / AllExtendedRights | 9 |
| WriteDACL / Owns / ReadLAPSPassword / GenericWrite / WriteOwner | 8 |
| AdminTo / ForceChangePassword / AddSelf / AddMember | 7 |
| HasSession | 6 |
| CanRDP / SQLAdmin | 5 |
| MemberOf | 3 |
