/* ── Defense ROI Calculator Panel ────────────────────────────────────────── */
import { useStore } from '../store';
import { DollarSignIcon, ActivityIcon, LoaderIcon } from './Icons';

const COMPLEXITY_COLOR: Record<string, string> = {
  Low:    '#22c55e',
  Medium: '#f59e0b',
  High:   '#ef4444',
};

const COMPLEXITY_BG: Record<string, string> = {
  Low:    'rgba(34,197,94,0.12)',
  Medium: 'rgba(245,158,11,0.12)',
  High:   'rgba(239,68,68,0.12)',
};

export default function ROIPanel() {
  const analysis      = useStore((s: any) => s.analysis);
  const roiData       = useStore((s: any) => s.roiData);
  const roiLoading    = useStore((s: any) => s.roiLoading);
  const loadROI       = useStore((s: any) => s.loadROI);
  const analysisParams = useStore((s: any) => s.analysisParams);

  const items: any[] = roiData ?? [];
  const maxROI = items.length > 0 ? Math.max(...items.map((i: any) => i.roiScore)) : 1;

  if (!analysis) {
    return (
      <div className="panel-empty">
        <DollarSignIcon size={32} className="panel-empty-icon" />
        <p>Run an analysis to calculate defense ROI for each critical edge.</p>
      </div>
    );
  }

  return (
    <div className="roi-panel">
      {/* header */}
      <div className="section-header">
        <div className="section-header-left">
          <DollarSignIcon size={15} />
          <span>Defense ROI Calculator</span>
          {items.length > 0 && (
            <span className="badge-muted">{items.length} edges</span>
          )}
        </div>
        <button
          className="btn-secondary"
          onClick={() => loadROI(analysisParams)}
          disabled={roiLoading}
        >
          <ActivityIcon size={13} />
          {roiLoading ? 'Calculating…' : items.length > 0 ? 'Refresh' : 'Calculate ROI'}
        </button>
      </div>

      {roiLoading && (
        <div className="panel-loading">
          <div className="spin-ring" />
          <span>Simulating edge removals…</span>
        </div>
      )}

      {!roiLoading && items.length === 0 && (
        <div className="panel-empty-sm">
          <p>Click "Calculate ROI" to see the impact of fixing each critical edge.</p>
        </div>
      )}

      {/* summary insight */}
      {items.length > 0 && (() => {
        const best = items[0];
        return (
          <div className="roi-insight-card">
            <div className="roi-insight-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div>
              <div className="roi-insight-title">Best Investment</div>
              <div className="roi-insight-body">
                Fixing <strong>{best.relation}</strong> ({best.source} → {best.target}) reduces attack paths
                by <strong>{best.riskReductionPercent?.toFixed(1)}%</strong> with{' '}
                <strong>{best.fixComplexity}</strong> complexity (~{best.estimatedDays} days).
              </div>
            </div>
          </div>
        );
      })()}

      {/* ROI items */}
      <div className="roi-list">
        {items.map((item: any, idx: number) => {
          const barPct = maxROI > 0 ? (item.roiScore / maxROI) * 100 : 0;
          return (
            <div key={item.edgeId} className="roi-item">
              <div className="roi-item-rank">#{idx + 1}</div>

              <div className="roi-item-body">
                <div className="roi-item-top">
                  <span className="roi-relation">{item.relation}</span>
                  <span className="roi-arrow">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </span>
                  <span className="roi-target">{item.source} → {item.target}</span>
                  <span
                    className="roi-complexity-tag"
                    style={{
                      color: COMPLEXITY_COLOR[item.fixComplexity],
                      background: COMPLEXITY_BG[item.fixComplexity],
                    }}
                  >
                    {item.fixComplexity} fix · {item.estimatedDays}d
                  </span>
                </div>

                {/* ROI bar */}
                <div className="roi-bar-row">
                  <div className="roi-bar-track">
                    <div
                      className="roi-bar-fill"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span className="roi-bar-label">ROI {item.roiScore?.toFixed(1)}</span>
                </div>

                <div className="roi-metrics">
                  <div className="roi-metric">
                    <span className="roi-metric-val" style={{ color: '#22c55e' }}>
                      -{item.riskReductionPercent?.toFixed(1)}%
                    </span>
                    <span className="roi-metric-label">Risk</span>
                  </div>
                  <div className="roi-metric">
                    <span className="roi-metric-val" style={{ color: '#3b82f6' }}>
                      -{item.pathsEliminated}
                    </span>
                    <span className="roi-metric-label">Paths</span>
                  </div>
                  <div className="roi-metric">
                    <span className="roi-metric-val" style={{ color: '#f59e0b' }}>
                      {item.percentOfPaths?.toFixed(1)}%
                    </span>
                    <span className="roi-metric-label">Coverage</span>
                  </div>
                  <div className="roi-metric">
                    <span className="roi-metric-val">
                      {item.riskReductionAbsolute?.toFixed(0)}
                    </span>
                    <span className="roi-metric-label">Δ Score</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
