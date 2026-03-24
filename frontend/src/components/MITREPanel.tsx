/* ── MITRE ATT&CK Panel ──────────────────────────────────────────────────── */
import { useStore } from '../store';
import { GridIcon, DownloadIcon, ActivityIcon, ExternalLinkIcon } from './Icons';

const TACTIC_COLORS: Record<string, string> = {
  'Initial Access':        '#ef4444',
  'Execution':             '#f97316',
  'Persistence':           '#f59e0b',
  'Privilege Escalation':  '#eab308',
  'Defense Evasion':       '#84cc16',
  'Credential Access':     '#22c55e',
  'Discovery':             '#14b8a6',
  'Lateral Movement':      '#3b82f6',
  'Collection':            '#8b5cf6',
  'Exfiltration':          '#ec4899',
  'Command and Control':   '#6366f1',
};

const SEV_COLOR: Record<string, string> = {
  Critical: '#ef4444',
  High:     '#f59e0b',
  Medium:   '#3b82f6',
  Low:      '#6b7194',
};

const SEV_BG: Record<string, string> = {
  Critical: 'rgba(239,68,68,0.12)',
  High:     'rgba(245,158,11,0.12)',
  Medium:   'rgba(59,130,246,0.12)',
  Low:      'rgba(107,113,148,0.10)',
};

export default function MITREPanel() {
  const mitreData    = useStore((s: any) => s.mitreData);
  const mitreLoading = useStore((s: any) => s.mitreLoading);
  const loadMITRE    = useStore((s: any) => s.loadMITRE);
  const analysis     = useStore((s: any) => s.analysis);
  const analysisParams = useStore((s: any) => s.analysisParams);

  const techniques: any[] = mitreData?.techniques ?? [];

  /* ── group by tactic ─────────────────────────────────────────────── */
  const byTactic: Record<string, any[]> = {};
  for (const t of techniques) {
    const tactic = t.tactic?.split(' / ')[0] ?? 'Unknown';
    (byTactic[tactic] ??= []).push(t);
  }

  /* ── export ATT&CK Navigator layer ──────────────────────────────── */
  function exportNavigator() {
    if (!mitreData?.navigatorLayer) return;
    const blob = new Blob(
      [JSON.stringify(mitreData.navigatorLayer, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attack-navigator-layer.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── empty / loading states ──────────────────────────────────────── */
  if (!analysis) {
    return (
      <div className="panel-empty">
        <GridIcon size={32} className="panel-empty-icon" />
        <p>Run an analysis first to see the MITRE ATT&CK coverage matrix.</p>
      </div>
    );
  }

  return (
    <div className="mitre-panel">
      {/* header */}
      <div className="mitre-header">
        <div className="mitre-header-left">
          <GridIcon size={15} />
          <span>MITRE ATT&amp;CK Matrix</span>
          {techniques.length > 0 && (
            <span className="mitre-badge">{techniques.length} techniques</span>
          )}
        </div>
        <div className="mitre-header-right">
          <button
            className="btn-secondary"
            onClick={() => loadMITRE(analysisParams)}
            disabled={mitreLoading}
          >
            <ActivityIcon size={13} />
            {mitreLoading ? 'Loading…' : 'Refresh'}
          </button>
          {techniques.length > 0 && (
            <button className="btn-secondary" onClick={exportNavigator} title="Export ATT&CK Navigator layer">
              <DownloadIcon size={13} />
              Navigator
            </button>
          )}
        </div>
      </div>

      {mitreLoading && (
        <div className="panel-loading">
          <div className="spin-ring" />
          <span>Mapping techniques…</span>
        </div>
      )}

      {!mitreLoading && techniques.length === 0 && (
        <div className="panel-empty-sm">
          <p>No techniques mapped yet.</p>
          <button className="btn-primary mt-8" onClick={() => loadMITRE(analysisParams)}>
            Map Techniques
          </button>
        </div>
      )}

      {/* summary stats */}
      {techniques.length > 0 && (
        <>
          <div className="mitre-stats-row">
            {(['Critical','High','Medium','Low'] as const).map(sev => {
              const count = techniques.filter(t => t.severity === sev).length;
              return count > 0 ? (
                <div key={sev} className="mitre-stat-chip" style={{
                  background: SEV_BG[sev],
                  border: `1px solid ${SEV_COLOR[sev]}40`,
                  color: SEV_COLOR[sev],
                }}>
                  <span className="mitre-stat-num">{count}</span>
                  <span className="mitre-stat-label">{sev}</span>
                </div>
              ) : null;
            })}
          </div>

          {/* technique cards grouped by tactic */}
          <div className="mitre-tactics">
            {Object.entries(byTactic).map(([tactic, techs]) => (
              <div key={tactic} className="mitre-tactic-group">
                <div
                  className="mitre-tactic-header"
                  style={{ borderLeftColor: TACTIC_COLORS[tactic] ?? '#6b7194' }}
                >
                  <span
                    className="mitre-tactic-dot"
                    style={{ background: TACTIC_COLORS[tactic] ?? '#6b7194' }}
                  />
                  <span className="mitre-tactic-name">{tactic}</span>
                  <span className="mitre-tactic-count">{techs.length}</span>
                </div>

                <div className="mitre-technique-list">
                  {techs.map(t => (
                    <div
                      key={t.id}
                      className="mitre-technique-card"
                      style={{ borderLeftColor: SEV_COLOR[t.severity] ?? '#6b7194' }}
                    >
                      <div className="mitre-tc-top">
                        <code className="mitre-tc-id">{t.id}</code>
                        <span
                          className="mitre-tc-sev"
                          style={{ color: SEV_COLOR[t.severity], background: SEV_BG[t.severity] }}
                        >
                          {t.severity}
                        </span>
                        <span className="mitre-tc-paths">{t.usageCount} paths</span>
                      </div>
                      <div className="mitre-tc-name">{t.name.split(':')[0]}</div>
                      {t.name.includes(':') && (
                        <div className="mitre-tc-sub">{t.name.split(':')[1].trim()}</div>
                      )}
                      <div className="mitre-tc-relations">
                        {(t.relations ?? []).map((r: string) => (
                          <span key={r} className="edge-tag">{r}</span>
                        ))}
                      </div>
                      <div className="mitre-tc-desc">{t.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ATT&CK Navigator export hint */}
          <div className="mitre-navigator-hint">
            <ExternalLinkIcon size={12} />
            <span>
              Export the Navigator layer and import it at{' '}
              <strong>mitre-attack.github.io/attack-navigator</strong> for an
              interactive heatmap.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
