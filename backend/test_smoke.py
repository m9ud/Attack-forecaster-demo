"""Quick smoke test for the graph engine."""
from app.graph_engine import GraphEngine

e = GraphEngine()
r = e.analyze(
    ["User_LowPriv1", "User_LowPriv2", "User_LowPriv3", "User_LowPriv4"],
    "DC01",
)
print(f"Paths: {r['totalPaths']}")
print(f"Global Risk: {r['globalRisk']}")
print(f"Shortest: {r['shortestHops']}")
print(f"Top 5:")
for p in r["top5"]:
    print(f"  {p['pathId']} | hops={p['hops']} risk={p['risk']} crit={p['throughCritical']}")
print(f"Critical edges:")
for c in r["criticalEdges"][:3]:
    print(f"  {c['edgeId']} {c['source']}->{c['target']} ({c['relation']}) count={c['traversalCount']} ({c['percentOfPaths']}%)")
