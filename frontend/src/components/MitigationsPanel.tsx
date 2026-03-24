/* ── Mitigations Panel — rule-based AI mitigation suggestions ─────────────── */

import { useStore } from '../store';
import { ShieldIcon, LoaderIcon, CheckCircleIcon } from './Icons';

const PRIORITY_COLOR: Record<string, string> = {
  Critical: 'var(--red)',
  High:     'var(--yellow)',
  Medium:   'var(--accent)',
  Low:      'var(--green)',
};

const PRIORITY_BG: Record<string, string> = {
  Critical: 'rgba(248,81,73,.10)',
  High:     'rgba(227,179,65,.10)',
  Medium:   'rgba(88,166,255,.10)',
  Low:      'rgba(63,185,80,.10)',
};

export default function MitigationsPanel() {
  const mitigations        = useStore((s: any) => s.mitigations);
  const mitigationsLoading = useStore((s: any) => s.mitigationsLoading);
  const analysis           = useStore((s: any) => s.analysis);
  const startOptions       = useStore((s: any) => s.startOptions);
  const loadMitigations    = useStore((s: any) => s.loadMitigations);

  const handleLoad = () => {
    if (!analysis) return;
    const target = analysis.paths[0]?.nodes.at(-1) ?? '';
    loadMitigations(startOptions.slice(0, 4), target);
  };

  if (!analysis) {
    return (
      <div className="panel">
        <h3><ShieldIcon size={14} /> Mitigations</h3>
        <p className="muted">Run analysis first to generate mitigation recommendations.</p>
      </div>
    );
  }

  const counts = mitigations.reduce((acc: Record<string, number>, m: any) => {
    acc[m.priority] = (acc[m.priority] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="panel">
      <h3><ShieldIcon size={14} /> Mitigation Recommendations</h3>
      <p className="muted" style={{ marginBottom: 12 }}>
        Rule-based suggestions derived from discovered attack paths and critical edges.
        Prioritised by threat severity.
      </p>

      {mitigations.length === 0 && !mitigationsLoading && (
        <button className="btn-primary" onClick={handleLoad} style={{ width: '100%' }}>
          <ShieldIcon size={13} /> Generate Mitigations
        </button>
      )}

      {mitigationsLoading && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text2)', fontSize: 13 }}>
          <LoaderIcon size={13} className="spin-icon" /> Analysing attack paths…
        </div>
      )}

      {mitigations.length > 0 && (
        <>
          {/* Summary badges */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {(['Critical', 'High', 'Medium', 'Low'] as const).map(p =>
              counts[p] ? (
                <span
                  key={p}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px',
                    borderRadius: 20, color: PRIORITY_COLOR[p],
                    background: PRIORITY_BG[p],
                    border: `1px solid ${PRIORITY_COLOR[p]}44`,
                  }}
                >
                  {counts[p]} {p}
                </span>
              ) : null
            )}
            <button className="btn-sm" onClick={handleLoad} disabled={mitigationsLoading} style={{ marginLeft: 'auto' }}>
              Refresh
            </button>
          </div>

          {/* Mitigation cards */}
          <div className="mitigation-list">
            {mitigations.map((m: any, i: number) => (
              <div
                key={i}
                className="mitigation-card"
                style={{ borderLeftColor: PRIORITY_COLOR[m.priority] }}
              >
                <div className="mitigation-header">
                  <span
                    className="mitigation-priority"
                    style={{ color: PRIORITY_COLOR[m.priority], background: PRIORITY_BG[m.priority] }}
                  >
                    {m.priority}
                  </span>
                  <span className="mitigation-category">{m.category}</span>
                </div>
                <div className="mitigation-title">
                  <CheckCircleIcon size={13} style={{ color: PRIORITY_COLOR[m.priority], flexShrink: 0 }} />
                  {m.title}
                </div>
                <div className="mitigation-detail">{m.detail}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
