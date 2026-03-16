"""Quick smoke test for the graph engine."""
from app import dataset as ds
from app.graph_engine import GraphEngine

ds.reset_to_default()

e = GraphEngine()
r = e.analyze(
    ["tywin.lannister", "arya.stark", "samwell.tarly"],
    "kingslanding",
    min_depth=3,
    max_depth=10,
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
