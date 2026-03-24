/* ── Results Panel — paths, metrics, critical edges, export ──────────────── */

import { useStore } from '../store';
import { DownloadIcon, TrendingUpIcon, ActivityIcon } from './Icons';

const HEATMAP_COLOR = (weight: number) => {
  if (weight >= 9)  return '#f85149';   // Critical — red
  if (weight >= 7)  return '#e3b341';   // High — yellow
  if (weight >= 5)  return '#58a6ff';   // Medium — blue
  return '#3fb950';                     // Low — green
};

export default function ResultsPanel() {
  const analysis       = useStore((s: any) => s.analysis);
  const selectedPathId = useStore((s: any) => s.selectedPathId);
  const selectPath     = useStore((s: any) => s.selectPath);
  const loadExplanation= useStore((s: any) => s.loadExplanation);
  const startOptions   = useStore((s: any) => s.startOptions);
  const exportReport   = useStore((s: any) => s.exportReport);

  if (!analysis) {
    return (
      <div className="panel">
        <h3>Results</h3>
        <p className="muted">Run analysis to see results</p>
      </div>
    );
  }

  const avgExploit = analysis.paths.length
    ? (analysis.paths.reduce((s: number, p: any) => s + (p.exploitEase ?? 0.8), 0) / analysis.paths.length * 100).toFixed(0)
    : '—';
  const avgStealth = analysis.paths.length
    ? (analysis.paths.reduce((s: number, p: any) => s + (p.stealthFactor ?? 0.7), 0) / analysis.paths.length * 100).toFixed(0)
    : '—';

  const handleExport = () => {
    const target = analysis.paths[0]?.nodes.at(-1) ?? '';
    exportReport(startOptions.slice(0, 4), target);
  };

  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Results</h3>
        <button className="btn-sm btn-export" onClick={handleExport} title="Export JSON report">
          <DownloadIcon size={12} /> Export
        </button>
      </div>

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
          <span className="metric-value metric-risk">{analysis.globalRisk}</span>
          <span className="metric-label">Global Risk</span>
        </div>
      </div>

      {/* Multi-factor summary */}
      <div className="multifactor-row">
        <div className="mf-card">
          <TrendingUpIcon size={12} />
          <span className="mf-label">Avg Exploit Ease</span>
          <span className="mf-value">{avgExploit}%</span>
        </div>
        <div className="mf-card">
          <ActivityIcon size={12} />
          <span className="mf-label">Avg Stealth</span>
          <span className="mf-value">{avgStealth}%</span>
        </div>
      </div>

      {/* Top 5 paths */}
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
          {analysis.top5.map((p: any) => (
            <tr
              key={p.pathId}
              className={selectedPathId === p.pathId ? 'selected' : ''}
              onClick={() => selectPath(p.pathId)}
            >
              <td><strong>{p.pathId}</strong></td>
              <td>{p.hops}</td>
              <td>{p.risk}</td>
              <td>{p.normalizedScore ?? '—'}</td>
              <td>
                <span className={`impact-badge impact-${(p.impactEstimation || 'low').toLowerCase()}`}>
                  {p.impactEstimation || '—'}
                </span>
              </td>
              <td>{p.throughCritical ? <span style={{color:'#e3b341',fontWeight:700}}>+</span> : '—'}</td>
              <td>
                <button
                  className="btn-sm"
                  onClick={(e) => { e.stopPropagation(); loadExplanation(p.pathId); }}
                >
                  Story
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Critical edges — risk heatmap */}
      <h4>Critical Edges <span style={{ color: 'var(--text2)', fontWeight: 400, fontSize: 11 }}>(risk heatmap)</span></h4>
      <div className="critical-list">
        {analysis.criticalEdges.slice(0, 6).map((ce: any) => (
          <div key={ce.edgeId} className="critical-item">
            <div
              className="heatmap-dot"
              style={{ background: HEATMAP_COLOR(ce.traversalCount) }}
              title={`${ce.traversalCount} paths — ${ce.percentOfPaths}%`}
            />
            <div className="critical-item-body">
              <span className="crit-id">{ce.edgeId}</span>
              <span className="crit-rel" style={{ color: HEATMAP_COLOR(ce.traversalCount) }}>
                {ce.relation}
              </span>
              <span className="crit-nodes">{ce.source} → {ce.target}</span>
            </div>
            <span className="badge-sm">{ce.traversalCount} ({ce.percentOfPaths}%)</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <span style={{ color: '#f85149' }}>■ Critical</span>
        <span style={{ color: '#e3b341' }}>■ High</span>
        <span style={{ color: '#58a6ff' }}>■ Medium</span>
        <span style={{ color: '#3fb950' }}>■ Low</span>
      </div>
    </div>
  );
}
