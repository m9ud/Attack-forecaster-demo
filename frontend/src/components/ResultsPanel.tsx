/* ── Results Panel — paths, metrics, critical edges ─────────────────── */

import { useStore } from '../store';

export default function ResultsPanel() {
  const analysis = useStore((s: any) => s.analysis);
  const selectedPathId = useStore((s: any) => s.selectedPathId);
  const selectPath = useStore((s: any) => s.selectPath);
  const loadExplanation = useStore((s: any) => s.loadExplanation);

  if (!analysis) {
    return (
      <div className="panel">
        <h3>Results</h3>
        <p className="muted">Run analysis to see results</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>Results</h3>

      {/* KPI cards */}
      <div className="metrics">
        <div className="metric">
          <span className="metric-value">{analysis.totalPaths}</span>
          <span className="metric-label">Total Paths</span>
        </div>
        <div className="metric">
          <span className="metric-value">{analysis.shortestHops}</span>
          <span className="metric-label">Shortest</span>
        </div>
        <div className="metric">
          <span className="metric-value">{analysis.globalRisk}</span>
          <span className="metric-label">Global Risk</span>
        </div>
      </div>

      {/* Top 5 paths table */}
      <h4>Top 5 Highest-Risk Paths</h4>
      <table className="data-table">
        <thead>
          <tr>
            <th>Path</th>
            <th>Hops</th>
            <th>Risk</th>
            <th>Score</th>
            <th>Impact</th>
            <th>Crit</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {analysis.top5.map((p) => (
            <tr
              key={p.pathId}
              className={selectedPathId === p.pathId ? 'selected' : ''}
              onClick={() => selectPath(p.pathId)}
            >
              <td><strong>{p.pathId}</strong></td>
              <td>{p.hops}</td>
              <td>{p.risk}</td>
              <td>{p.normalizedScore ?? '—'}</td>
              <td><span className={`impact-badge impact-${(p.impactEstimation || 'low').toLowerCase()}`}>{p.impactEstimation || '—'}</span></td>
              <td>{p.throughCritical ? '★' : '—'}</td>
              <td>
                <button
                  className="btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadExplanation(p.pathId);
                  }}
                >
                  Explain
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Critical edges */}
      <h4>Critical Edges (bottlenecks)</h4>
      <div className="critical-list">
        {analysis.criticalEdges.slice(0, 5).map((ce) => (
          <div
            key={ce.edgeId}
            className={`critical-item ${ce.edgeId === 'E090' ? 'highlight' : ''}`}
          >
            <strong>{ce.edgeId}</strong>
            &nbsp;{ce.source} &rarr;&nbsp;
            <em>{ce.relation}</em>
            &nbsp;&rarr; {ce.target}
            <span className="badge-sm">
              {ce.traversalCount} paths ({ce.percentOfPaths}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
