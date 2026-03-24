/* ── What-If Time Machine Panel ──────────────────────────────────────────── */
import { useStore } from '../store';
import { CalendarIcon, ActivityIcon, LoaderIcon } from './Icons';

export default function TimelineMachine() {
  const analysis       = useStore((s: any) => s.analysis);
  const timelineData   = useStore((s: any) => s.timelineData);
  const timelineLoading = useStore((s: any) => s.timelineLoading);
  const loadTimeline   = useStore((s: any) => s.loadTimeline);
  const analysisParams = useStore((s: any) => s.analysisParams);

  const points: any[] = timelineData ?? [];
  const baseRisk = points[0]?.globalRisk ?? 0;
  const finalRisk = points[points.length - 1]?.globalRisk ?? 0;
  const totalReduction = baseRisk > 0
    ? ((baseRisk - finalRisk) / baseRisk * 100).toFixed(1)
    : '0';

  if (!analysis) {
    return (
      <div className="panel-empty">
        <CalendarIcon size={32} className="panel-empty-icon" />
        <p>Run an analysis first to simulate the remediation timeline.</p>
      </div>
    );
  }

  return (
    <div className="timeline-panel">
      {/* header */}
      <div className="section-header">
        <div className="section-header-left">
          <CalendarIcon size={15} />
          <span>What-If Time Machine</span>
          {points.length > 0 && (
            <span className="badge-muted">{points.length} stages</span>
          )}
        </div>
        <button
          className="btn-secondary"
          onClick={() => loadTimeline(analysisParams)}
          disabled={timelineLoading}
        >
          <ActivityIcon size={13} />
          {timelineLoading ? 'Simulating…' : points.length > 0 ? 'Refresh' : 'Simulate Timeline'}
        </button>
      </div>

      {timelineLoading && (
        <div className="panel-loading">
          <div className="spin-ring" />
          <span>Simulating remediation stages…</span>
        </div>
      )}

      {!timelineLoading && points.length === 0 && (
        <div className="panel-empty-sm">
          <p>Click "Simulate Timeline" to project risk reduction over time.</p>
        </div>
      )}

      {/* summary */}
      {points.length > 1 && (
        <div className="timeline-summary">
          <div className="timeline-summary-metric">
            <span className="timeline-summary-val">{baseRisk.toFixed(0)}</span>
            <span className="timeline-summary-label">Current Risk</span>
          </div>
          <div className="timeline-summary-arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </div>
          <div className="timeline-summary-metric">
            <span className="timeline-summary-val" style={{ color: '#22c55e' }}>{finalRisk.toFixed(0)}</span>
            <span className="timeline-summary-label">After Full Plan</span>
          </div>
          <div className="timeline-summary-metric">
            <span className="timeline-summary-val" style={{ color: '#22c55e' }}>-{totalReduction}%</span>
            <span className="timeline-summary-label">Total Reduction</span>
          </div>
        </div>
      )}

      {/* timeline steps */}
      {points.length > 0 && (
        <div className="timeline-steps">
          {points.map((point: any, idx: number) => {
            const isFirst = idx === 0;
            const isLast  = idx === points.length - 1;
            const reductionPct = point.riskReductionPercent ?? 0;
            const barWidth = baseRisk > 0
              ? Math.max(4, (point.globalRisk / baseRisk) * 100)
              : 100;

            return (
              <div key={idx} className={`timeline-step ${isFirst ? 'timeline-step--current' : ''} ${isLast ? 'timeline-step--final' : ''}`}>
                {/* connector line */}
                {!isLast && <div className="timeline-connector" />}

                {/* dot */}
                <div className={`timeline-dot ${isFirst ? 'dot--current' : reductionPct >= 60 ? 'dot--good' : 'dot--mid'}`}>
                  {isFirst ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="8"/>
                    </svg>
                  ) : isLast ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  )}
                </div>

                {/* content */}
                <div className="timeline-content">
                  <div className="timeline-label">{point.label}</div>
                  <div className="timeline-desc">{point.description}</div>

                  {/* risk bar */}
                  <div className="timeline-risk-row">
                    <div className="timeline-risk-track">
                      <div
                        className="timeline-risk-fill"
                        style={{
                          width: `${barWidth}%`,
                          background: isFirst
                            ? '#ef4444'
                            : reductionPct >= 60
                              ? '#22c55e'
                              : reductionPct >= 30
                                ? '#f59e0b'
                                : '#3b82f6',
                        }}
                      />
                    </div>
                    <div className="timeline-risk-vals">
                      <span className="timeline-risk-num">{point.globalRisk?.toFixed(0)}</span>
                      {!isFirst && (
                        <span className="timeline-risk-delta" style={{ color: '#22c55e' }}>
                          -{reductionPct}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* stats row */}
                  <div className="timeline-stats">
                    <span className="timeline-stat">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M9 3v18"/>
                      </svg>
                      {point.totalPaths} paths
                    </span>
                    {point.mitigationsApplied?.length > 0 && point.mitigationsApplied[0] !== '' && (
                      <span className="timeline-stat">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {point.mitigationsApplied.length} mitigations
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
