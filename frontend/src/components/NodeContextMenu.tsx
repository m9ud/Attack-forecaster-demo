/* ── Node Right-Click Context Menu ────────────────────────────────────────
   Shows node info, why it's in attack paths, and quick What-If simulations.
   ──────────────────────────────────────────────────────────────────────── */

import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { ZapIcon, TargetIcon, ActivityIcon, SearchIcon, ShieldIcon, CheckCircleIcon, AlertTriangleIcon } from './Icons';

/* ── Kill-chain phase labels (mirrors backend explainer.py) ── */
const PHASE: Record<string, string> = {
  MemberOf: 'Reconnaissance', HasSession: 'Credential Access',
  CanRDP: 'Lateral Movement', AdminTo: 'Privilege Escalation',
  WriteDACL: 'Privilege Escalation', GenericAll: 'Privilege Escalation',
  GenericWrite: 'Persistence', WriteOwner: 'Privilege Escalation',
  AddSelf: 'Privilege Escalation', AddMember: 'Privilege Escalation',
  ForceChangePassword: 'Credential Access', DCSync: 'Exfiltration',
  ReadLAPSPassword: 'Credential Access', AllExtendedRights: 'Privilege Escalation',
  Owns: 'Privilege Escalation', SQLAdmin: 'Execution',
};

const PHASE_COLOR: Record<string, string> = {
  Reconnaissance: '#58a6ff', 'Credential Access': '#e3b341',
  'Lateral Movement': '#8b5cf6', 'Privilege Escalation': '#f85149',
  Persistence: '#3fb950', Exfiltration: '#ec4899', Execution: '#f97316',
};

const PRIV_COLOR: Record<string, string> = {
  'Domain Controller': '#f85149', 'Domain Admin': '#f85149',
  'Mid-High': '#e3b341', 'Mid': '#e3b341', Low: '#8b949e', '': '#8b949e',
};

export default function NodeContextMenu() {
  const contextMenu      = useStore((s: any) => s.contextMenu);
  const closeContextMenu = useStore((s: any) => s.closeContextMenu);
  const runNodeWhatIf    = useStore((s: any) => s.runNodeWhatIf);
  const nodeWhatIfResult = useStore((s: any) => s.nodeWhatIfResult);
  const nodeWhatIfLoading= useStore((s: any) => s.nodeWhatIfLoading);
  const nodes            = useStore((s: any) => s.nodes);
  const edges            = useStore((s: any) => s.edges);
  const analysis         = useStore((s: any) => s.analysis);

  const [tab, setTab] = useState<'info' | 'paths' | 'whatif'>('info');
  const menuRef = useRef<HTMLDivElement>(null);

  /* Close on Escape or outside click */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeContextMenu(); };
    const onClickOut = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeContextMenu();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOut);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClickOut); };
  }, [closeContextMenu]);

  /* Reset tab when a new node is right-clicked */
  useEffect(() => { setTab('info'); }, [contextMenu?.nodeName]);

  if (!contextMenu) return null;

  const { nodeName, x, y } = contextMenu;

  /* ── Derive node data ── */
  const nodeData = nodes.find((n: any) => n.name === nodeName);
  const outEdges = edges.filter((e: any) => e.source === nodeName);
  const inEdges  = edges.filter((e: any) => e.target === nodeName);

  /* ── Derive path membership ── */
  const pathsContaining = analysis
    ? analysis.paths.filter((p: any) => p.nodes.includes(nodeName))
    : [];
  const isStart  = pathsContaining.some((p: any) => p.nodes[0] === nodeName);
  const isTarget = pathsContaining.some((p: any) => p.nodes.at(-1) === nodeName);
  const isPivot  = pathsContaining.length > 0 && !isStart && !isTarget;

  const role = isStart
    ? <><ZapIcon size={11} /> Start Node</>
    : isTarget
    ? <><TargetIcon size={11} /> Target (Crown Jewel)</>
    : isPivot
    ? <><ActivityIcon size={11} /> Pivot / Bridge</>
    : <span>Not on attack path</span>;
  const roleColor = isTarget ? '#f85149' : isStart ? '#e3b341' : isPivot ? '#58a6ff' : '#8b949e';

  /* Unique relation types flowing through this node on attack paths */
  const relationsThrough = new Set<string>();
  pathsContaining.forEach((p: any) => {
    p.edges.forEach((e: any) => {
      if (e.source === nodeName || e.target === nodeName) relationsThrough.add(e.relation);
    });
  });

  /* ── Viewport-safe position ── */
  const menuW = 340, menuH = 460;
  const safeX = Math.min(x, window.innerWidth  - menuW - 12);
  const safeY = Math.min(y, window.innerHeight - menuH - 12);

  /* ── DA group name ── */
  const daGroup = nodes.find((n: any) => n.type === 'Group' && /domain admins/i.test(n.name))?.name ?? 'Domain Admins';

  return (
    <div
      ref={menuRef}
      className="ncm"
      style={{ left: safeX, top: safeY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div className="ncm-header">
        <div className="ncm-title">
          <span className="ncm-name">{nodeName}</span>
          {nodeData?.highValue && <span className="ncm-hv-badge">HVT</span>}
        </div>
        <button className="ncm-close" onClick={closeContextMenu} aria-label="Close">&#x2715;</button>
      </div>

      {/* Role pill */}
      <div className="ncm-role" style={{ color: roleColor, borderColor: roleColor + '44', background: roleColor + '11' }}>
        {role} {pathsContaining.length > 0 && `· ${pathsContaining.length} path${pathsContaining.length !== 1 ? 's' : ''}`}
      </div>

      {/* Tabs */}
      <div className="ncm-tabs">
        {(['info', 'paths', 'whatif'] as const).map(t => (
          <button key={t} className={`ncm-tab ${tab === t ? 'ncm-tab--active' : ''}`} onClick={() => setTab(t)}>
            {t === 'info' ? <><ActivityIcon size={11} /> Info</> : t === 'paths' ? <><SearchIcon size={11} /> Analysis</> : <><ZapIcon size={11} /> What-If</>}
          </button>
        ))}
      </div>

      <div className="ncm-body">

        {/* ── INFO TAB ── */}
        {tab === 'info' && (
          <div className="ncm-section-list">
            <Row label="Type"      value={nodeData?.type ?? '—'} />
            <Row label="Privilege" value={nodeData?.privilegeLevel || 'Low'}
              valueStyle={{ color: PRIV_COLOR[nodeData?.privilegeLevel ?? ''] ?? '#8b949e', fontWeight: 600 }} />
            <Row label="Subnet"    value={nodeData?.subnet || '—'} />
            <Row label="High Value" value={nodeData?.highValue ? 'Yes +' : 'No'}
              valueStyle={{ color: nodeData?.highValue ? '#f85149' : '#8b949e' }} />

            {outEdges.length > 0 && (
              <>
                <div className="ncm-sub-label">Outgoing attack relations</div>
                {outEdges.slice(0, 6).map((e: any) => (
                  <div key={e.id} className="ncm-edge-row">
                    <span className="ncm-edge-rel" style={{ color: PHASE_COLOR[PHASE[e.relation] ?? ''] ?? '#8b949e' }}>
                      {e.relation}
                    </span>
                    <span className="ncm-edge-arrow">→</span>
                    <span className="ncm-edge-node">{e.target}</span>
                    <span className="ncm-edge-phase">{PHASE[e.relation] ?? ''}</span>
                  </div>
                ))}
              </>
            )}
            {inEdges.length > 0 && (
              <>
                <div className="ncm-sub-label">Incoming relations (who can reach this node)</div>
                {inEdges.slice(0, 5).map((e: any) => (
                  <div key={e.id} className="ncm-edge-row">
                    <span className="ncm-edge-node">{e.source}</span>
                    <span className="ncm-edge-arrow">→</span>
                    <span className="ncm-edge-rel" style={{ color: PHASE_COLOR[PHASE[e.relation] ?? ''] ?? '#8b949e' }}>
                      {e.relation}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── PATHS / ANALYSIS TAB ── */}
        {tab === 'paths' && (
          <div className="ncm-section-list">
            {pathsContaining.length === 0 ? (
              <p className="ncm-muted">This node is not on any discovered attack path.<br />Run analysis first.</p>
            ) : (
              <>
                <div className="ncm-stat-row">
                  <div className="ncm-stat">
                    <span className="ncm-stat-val">{pathsContaining.length}</span>
                    <span className="ncm-stat-lbl">Paths through node</span>
                  </div>
                  <div className="ncm-stat">
                    <span className="ncm-stat-val">{analysis ? Math.round(pathsContaining.length / analysis.totalPaths * 100) : 0}%</span>
                    <span className="ncm-stat-lbl">Of all paths</span>
                  </div>
                  <div className="ncm-stat">
                    <span className="ncm-stat-val" style={{ color: roleColor }}>{isStart ? 'Start' : isTarget ? 'Target' : 'Pivot'}</span>
                    <span className="ncm-stat-lbl">Role</span>
                  </div>
                </div>

                {relationsThrough.size > 0 && (
                  <>
                    <div className="ncm-sub-label">Attack techniques through this node</div>
                    <div className="ncm-tags">
                      {[...relationsThrough].map(r => (
                        <span key={r} className="ncm-tag" style={{ borderColor: (PHASE_COLOR[PHASE[r] ?? ''] ?? '#8b949e') + '66', color: PHASE_COLOR[PHASE[r] ?? ''] ?? '#8b949e' }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                <div className="ncm-sub-label">Paths (top 5)</div>
                {pathsContaining.slice(0, 5).map((p: any) => (
                  <div key={p.pathId} className="ncm-path-row">
                    <strong className="ncm-path-id">{p.pathId}</strong>
                    <span className="ncm-path-nodes">{p.nodes.join(' → ')}</span>
                    <span className="ncm-path-risk" style={{ color: p.impactEstimation === 'Critical' ? '#f85149' : p.impactEstimation === 'High' ? '#e3b341' : '#58a6ff' }}>
                      {p.impactEstimation}
                    </span>
                  </div>
                ))}

                <div className="ncm-insight">
                  <strong>Why this node matters:</strong>{' '}
                  {isStart && `${nodeName} is a starting point — compromising it opens ${pathsContaining.length} attack paths.`}
                  {isTarget && `${nodeName} is the crown jewel — all ${pathsContaining.length} paths lead here.`}
                  {isPivot && `${nodeName} is a pivot/bridge — disabling it could eliminate up to ${pathsContaining.length} paths (${analysis ? Math.round(pathsContaining.length / analysis.totalPaths * 100) : 0}% of total).`}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── WHAT-IF TAB ── */}
        {tab === 'whatif' && (
          <div className="ncm-section-list">
            <p className="ncm-muted" style={{ marginBottom: 10 }}>
              Simulate changes to <strong>{nodeName}</strong> and instantly see the impact on attack paths.
            </p>

            <div className="ncm-whatif-btns">
              <WhatIfBtn
                icon={<AlertTriangleIcon size={13} />} label="Disable / Remove account"
                desc="Simulate removing this node from the network entirely"
                color="#f85149"
                onClick={() => runNodeWhatIf(nodeName, 'disable')}
                loading={nodeWhatIfLoading}
              />
              {nodeData?.type === 'User' && (
                <WhatIfBtn
                  icon={<TargetIcon size={13} />} label={`Add to ${daGroup}`}
                  desc="What new paths open if this user gains Domain Admin membership?"
                  color="#e3b341"
                  onClick={() => runNodeWhatIf(nodeName, 'addToDA')}
                  loading={nodeWhatIfLoading}
                />
              )}
              {nodeData?.type === 'User' && (
                <WhatIfBtn
                  icon={<ShieldIcon size={13} />} label="Add to Protected Users"
                  desc="Simulate adding to Protected Users group (disables NTLM, Kerberos delegation)"
                  color="#3fb950"
                  onClick={() => runNodeWhatIf(nodeName, 'disable')}
                  loading={nodeWhatIfLoading}
                />
              )}
              {nodeData?.type === 'User' && outEdges.some((e: any) => e.relation === 'AdminTo') && (
                <WhatIfBtn
                  icon={<ShieldIcon size={13} />} label="Remove AdminTo rights"
                  desc="Revoke local admin rights — simulate removing AdminTo edges"
                  color="#58a6ff"
                  onClick={() => {
                    const adminEdge = outEdges.find((e: any) => e.relation === 'AdminTo');
                    if (adminEdge) runNodeWhatIf(nodeName, 'addEdge', { source: '__none__', target: '__none__', relation: '__none__' });
                  }}
                  loading={nodeWhatIfLoading}
                />
              )}
            </div>

            {/* Result */}
            {nodeWhatIfResult && (
              <div className="ncm-whatif-result">
                <div className="ncm-wf-title">Simulation Result</div>
                <div className="ncm-wf-grid">
                  <WfMetric label="Paths Before" val={nodeWhatIfResult.totalPathsBefore} />
                  <WfMetric label="Paths After"  val={nodeWhatIfResult.totalPathsAfter}
                    color={nodeWhatIfResult.totalPathsAfter < nodeWhatIfResult.totalPathsBefore ? '#3fb950' : '#f85149'} />
                  <WfMetric label="Risk Before" val={nodeWhatIfResult.globalRiskBefore} />
                  <WfMetric label="Risk After"  val={nodeWhatIfResult.globalRiskAfter}
                    color={nodeWhatIfResult.globalRiskAfter < nodeWhatIfResult.globalRiskBefore ? '#3fb950' : '#f85149'} />
                </div>
                <div className="ncm-wf-delta">
                  {nodeWhatIfResult.totalPathsBefore > nodeWhatIfResult.totalPathsAfter
                    ? <><CheckCircleIcon size={12} style={{color:'#3fb950',marginRight:4}} />Eliminated {nodeWhatIfResult.eliminated} path{nodeWhatIfResult.eliminated !== 1 ? 's' : ''}. Risk reduced by {Math.round((nodeWhatIfResult.globalRiskBefore - nodeWhatIfResult.globalRiskAfter) / nodeWhatIfResult.globalRiskBefore * 100)}%.</>
                    : nodeWhatIfResult.totalPathsAfter > nodeWhatIfResult.totalPathsBefore
                    ? <><AlertTriangleIcon size={12} style={{color:'#e3b341',marginRight:4}} />New paths opened: +{nodeWhatIfResult.totalPathsAfter - nodeWhatIfResult.totalPathsBefore} paths. Risk increased by {Math.round((nodeWhatIfResult.globalRiskAfter - nodeWhatIfResult.globalRiskBefore) / Math.max(nodeWhatIfResult.globalRiskBefore, 1) * 100)}%.</>
                    : 'No change in attack paths detected.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Small helpers ── */
function Row({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <div className="ncm-row">
      <span className="ncm-row-label">{label}</span>
      <span className="ncm-row-value" style={valueStyle}>{value}</span>
    </div>
  );
}

function WhatIfBtn({ icon, label, desc, color, onClick, loading }: {
  icon: React.ReactNode; label: string; desc: string; color: string;
  onClick: () => void; loading: boolean;
}) {
  return (
    <button
      className="ncm-wif-btn"
      style={{ borderColor: color + '44', '--wif-color': color } as any}
      onClick={onClick}
      disabled={loading}
    >
      <span className="ncm-wif-icon">{icon}</span>
      <div>
        <div className="ncm-wif-label" style={{ color }}>{label}</div>
        <div className="ncm-wif-desc">{desc}</div>
      </div>
    </button>
  );
}

function WfMetric({ label, val, color }: { label: string; val: number; color?: string }) {
  return (
    <div className="ncm-wf-metric">
      <span className="ncm-wf-val" style={{ color: color ?? 'var(--text)' }}>{val}</span>
      <span className="ncm-wf-lbl">{label}</span>
    </div>
  );
}
