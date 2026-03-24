/* ── Critical Nodes Panel — betweenness centrality + path frequency ──────── */

import { useStore } from '../store';
import { TargetIcon, LoaderIcon, ZapIcon } from './Icons';

const PRIV_COLOR: Record<string, string> = {
  'Domain Controller': 'var(--red)',
  'Domain Admin':      'var(--red)',
  'Mid-High':          'var(--yellow)',
  'Mid':               'var(--yellow)',
  'Service':           'var(--yellow)',
  'Low':               'var(--text2)',
  '':                  'var(--text2)',
};

export default function CriticalNodesPanel() {
  const criticalNodes        = useStore((s: any) => s.criticalNodes);
  const criticalNodesLoading = useStore((s: any) => s.criticalNodesLoading);
  const analysis             = useStore((s: any) => s.analysis);
  const startOptions         = useStore((s: any) => s.startOptions);
  const loadCriticalNodes    = useStore((s: any) => s.loadCriticalNodes);

  const handleLoad = () => {
    if (!analysis) return;
    const target = analysis.paths[0]?.nodes.at(-1) ?? '';
    loadCriticalNodes(startOptions.slice(0, 4), target);
  };

  if (!analysis) {
    return (
      <div className="panel">
        <h3><TargetIcon size={14} /> Critical Nodes</h3>
        <p className="muted">Run analysis first to identify critical nodes.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3><TargetIcon size={14} /> Critical Nodes</h3>
      <p className="muted" style={{ marginBottom: 12 }}>
        Nodes ranked by <strong>betweenness centrality</strong> — removing them would
        most reduce the attack surface.
      </p>

      {criticalNodes.length === 0 && !criticalNodesLoading && (
        <button className="btn-primary" onClick={handleLoad} style={{ width: '100%' }}>
          <TargetIcon size={13} /> Compute Critical Nodes
        </button>
      )}

      {criticalNodesLoading && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text2)', fontSize: 13 }}>
          <LoaderIcon size={13} className="spin-icon" /> Computing betweenness centrality…
        </div>
      )}

      {criticalNodes.length > 0 && (
        <>
          <button
            className="btn-sm"
            onClick={handleLoad}
            style={{ marginBottom: 12 }}
            disabled={criticalNodesLoading}
          >
            Refresh
          </button>

          <div className="critical-node-list">
            {criticalNodes.map((node: any, i: number) => {
              const bar = Math.min(100, Math.round(node.criticalityScore));
              const color = node.highValue ? 'var(--red)' : PRIV_COLOR[node.privilegeLevel] ?? 'var(--text2)';
              return (
                <div key={node.name} className="cn-item">
                  <div className="cn-rank">{i + 1}</div>
                  <div className="cn-body">
                    <div className="cn-header">
                      <span className="cn-name" style={{ color: node.highValue ? 'var(--red)' : 'var(--text)' }}>
                        {node.highValue && <ZapIcon size={11} style={{ marginRight: 3, color: 'var(--red)' }} />}{node.name}
                      </span>
                      <span className="cn-type">{node.type}</span>
                    </div>
                    <div className="cn-bar-wrap">
                      <div className="cn-bar" style={{ width: `${bar}%`, background: color }} />
                    </div>
                    <div className="cn-stats">
                      <span>Centrality: {(node.betweenness * 100).toFixed(1)}%</span>
                      <span>In {node.pathTraversals} path{node.pathTraversals !== 1 ? 's' : ''}</span>
                      <span style={{ color: node.privilegeLevel === 'Domain Controller' || node.privilegeLevel === 'Domain Admin' ? 'var(--red)' : 'var(--text2)' }}>
                        {node.privilegeLevel || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="info-callout" style={{ marginTop: 14 }}>
            <strong>Interpretation</strong>
            Nodes at the top are chokepoints — isolating or monitoring them gives
            the highest return-on-investment for defenders.
          </div>
        </>
      )}
    </div>
  );
}
