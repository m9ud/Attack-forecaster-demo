# Attack Path Forecaster — Scenario-Based Risk Simulation Engine

A visual cybersecurity demo platform that computes attack paths through an
Active Directory–style graph, scores risk, identifies critical edges, and
simulates What-If remediation scenarios.

## Architecture

```
Attack-forecaster-demo/
├── backend/
│   ├── requirements.txt
│   ├── run.py
│   └── app/
│       ├── main.py            # FastAPI app (5 endpoints)
│       ├── models.py           # Pydantic request/response models
│       ├── dataset.py          # 31 nodes, 100 edges (hardcoded)
│       ├── graph_engine.py     # NetworkX graph + bounded DFS + risk calc
│       └── explainer.py        # Step-by-step attack chain explanation
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── App.tsx             # Root layout
│       ├── App.css             # Global dark-theme styles
│       ├── api.ts              # Fetch wrappers
│       ├── store.ts            # Zustand state management
│       ├── types.ts            # TypeScript definitions
│       └── components/
│           ├── GraphView.tsx    # React Flow + Dagre layout
│           ├── AnalysisPanel.tsx
│           ├── ResultsPanel.tsx
│           ├── ScenarioPanel.tsx
│           └── ExplanationModal.tsx
├── demo-dataset.md             # Full dataset specification document
└── README.md
```

## Prerequisites

- **Python 3.11+** with `pip`
- **Node.js 18+** with `npm`

## Quick Start

### 1. Backend

```powershell
cd backend
pip install -r requirements.txt
python run.py
```

Backend runs on **http://localhost:8000**.
Swagger docs at **http://localhost:8000/docs**.

### 2. Frontend (new terminal)

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**.

### 3. Use the App

1. Open **http://localhost:5173** in a browser.
2. The graph loads automatically (31 nodes, 100 edges).
3. Click **Analyze Attack Paths** — discovers paths from low-priv users to DC01.
4. Click any row in the **Top 5** table to highlight edges on the graph.
5. Click **Explain** to see the step-by-step attack chain reasoning.
6. Run **Scenario A / B / C** to compare before/after risk metrics.

## API Endpoints

| Method | Path         | Description                              |
|--------|-------------|------------------------------------------|
| GET    | `/graph`     | Returns all nodes and edges              |
| POST   | `/analyze`   | Runs bounded attack-path analysis        |
| GET    | `/explain`   | Step-by-step explanation for one path    |
| POST   | `/simulate`  | What-If scenario comparison              |
| GET    | `/scenarios` | Pre-built scenario definitions (A/B/C)   |

## Dataset Summary

- **14 Users** · **7 Groups** · **10 Computers/Servers** = 31 nodes
- **100 edges**: MemberOf(19) · AdminTo(27) · HasSession(23) · CanRDP(20) · GenericAll(4) · WriteDACL(7)
- **2 High Value Targets**: DC01 (Domain Controller), Domain_Admin

## Risk Scoring

```
risk(path) = Σ(edge_weights) / √(hops)

Edge weights:
  GenericAll = 9 | WriteDACL = 8 | AdminTo = 7
  HasSession = 6 | CanRDP = 5    | MemberOf = 3
```

## What-If Scenarios

| Scenario | Action                      | Expected Result     |
|----------|-----------------------------|---------------------|
| A        | Remove GenericAll E090      | ≥ 60% risk reduction |
| B        | Disable User_MidPriv1       | ~30% risk reduction |
| C        | Remove WriteDACL E100       | < 10% (false fix)   |