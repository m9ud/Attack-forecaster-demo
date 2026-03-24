/* ── Threat Intelligence Feed Panel ──────────────────────────────────────── */
import { useState } from 'react';
import { useStore } from '../store';
import { BugIcon, ActivityIcon, AlertTriangleIcon, CpuIcon } from './Icons';

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

export default function ThreatIntelPanel() {
  const analysis      = useStore((s: any) => s.analysis);
  const intelData     = useStore((s: any) => s.intelData);
  const intelLoading  = useStore((s: any) => s.intelLoading);
  const loadIntel     = useStore((s: any) => s.loadIntel);
  const analysisParams = useStore((s: any) => s.analysisParams);

  const [expanded, setExpanded] = useState<string | null>(null);

  const items: any[] = intelData?.items ?? [];
  const totalCVEs = intelData?.totalCVEs ?? 0;
  const exploitable = intelData?.exploitableCount ?? 0;

  if (!analysis) {
    return (
      <div className="panel-empty">
        <BugIcon size={32} className="panel-empty-icon" />
        <p>Run an analysis to check CVE exposure for nodes in attack paths.</p>
      </div>
    );
  }

  return (
    <div className="intel-panel">
      {/* header */}
      <div className="section-header">
        <div className="section-header-left">
          <BugIcon size={15} />
          <span>Threat Intel Feed</span>
          {items.length > 0 && (
            <span className="badge-muted">{items.length} nodes</span>
          )}
        </div>
        <button
          className="btn-secondary"
          onClick={() => loadIntel(analysisParams)}
          disabled={intelLoading}
        >
          <ActivityIcon size={13} />
          {intelLoading ? 'Fetching…' : items.length > 0 ? 'Refresh' : 'Fetch CVEs'}
        </button>
      </div>

      {intelLoading && (
        <div className="panel-loading">
          <div className="spin-ring" />
          <span>Querying threat intelligence…</span>
        </div>
      )}

      {!intelLoading && items.length === 0 && (
        <div className="panel-empty-sm">
          <p>Click "Fetch CVEs" to check nodes against known vulnerabilities.</p>
        </div>
      )}

      {/* summary stats */}
      {items.length > 0 && (
        <div className="intel-summary">
          <div className="intel-summary-stat">
            <span className="intel-summary-num">{totalCVEs}</span>
            <span className="intel-summary-label">Total CVEs</span>
          </div>
          <div className="intel-summary-stat">
            <span className="intel-summary-num" style={{ color: '#ef4444' }}>
              {items.reduce((s: number, i: any) => s + (i.criticalCount ?? 0), 0)}
            </span>
            <span className="intel-summary-label">Critical</span>
          </div>
          <div className="intel-summary-stat">
            <span className="intel-summary-num" style={{ color: '#f59e0b' }}>
              {exploitable}
            </span>
            <span className="intel-summary-label">Exploitable</span>
          </div>
          <div className="intel-summary-stat intel-update-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7194" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>Updated {items[0]?.lastUpdated ?? 'today'}</span>
          </div>
        </div>
      )}

      {/* node cards */}
      <div className="intel-nodes">
        {items.map((item: any) => {
          const isExpanded = expanded === item.nodeName;
          return (
            <div key={item.nodeName} className="intel-node-card">
              <button
                className="intel-node-header"
                onClick={() => setExpanded(isExpanded ? null : item.nodeName)}
              >
                <div className="intel-node-left">
                  <CpuIcon size={13} />
                  <span className="intel-node-name">{item.nodeName}</span>
                  <span className="badge-muted">{item.nodeType}</span>
                </div>
                <div className="intel-node-right">
                  {item.criticalCount > 0 && (
                    <span className="intel-sev-chip" style={{ color: '#ef4444', background: SEV_BG.Critical }}>
                      {item.criticalCount} Critical
                    </span>
                  )}
                  {item.highCount > 0 && (
                    <span className="intel-sev-chip" style={{ color: '#f59e0b', background: SEV_BG.High }}>
                      {item.highCount} High
                    </span>
                  )}
                  {item.exploitableCount > 0 && (
                    <span className="intel-exploit-tag">
                      <AlertTriangleIcon size={11} /> {item.exploitableCount} exploitable
                    </span>
                  )}
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="intel-cve-list">
                  {(item.cves ?? []).map((cve: any) => (
                    <div key={cve.cveId} className="intel-cve-card">
                      <div className="intel-cve-top">
                        <code className="intel-cve-id">{cve.cveId}</code>
                        <span
                          className="intel-cve-sev"
                          style={{ color: SEV_COLOR[cve.severity], background: SEV_BG[cve.severity] }}
                        >
                          {cve.severity}
                        </span>
                        <span className="intel-cve-cvss">CVSS {cve.cvssScore}</span>
                        {cve.exploitAvailable && (
                          <span className="intel-exploit-badge">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                            </svg>
                            PoC Available
                          </span>
                        )}
                      </div>
                      <div className="intel-cve-software">{cve.affectedSoftware}</div>
                      <div className="intel-cve-desc">{cve.description}</div>
                      <div className="intel-cve-meta">Published: {cve.publishedDate}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
