/* ── Filter Panel — Node & Edge filters ──────────────────────────────── */

import { useStore } from '../store';

const EDGE_TYPES = [
  'MemberOf', 'AdminTo', 'HasSession', 'CanRDP',
  'GenericAll', 'WriteDACL', 'Owns',
  'ForceChangePassword', 'ReadLAPSPassword', 'AllExtendedRights', 'DCSync',
];

export default function FilterPanel() {
  const nodeFilters = useStore((s: any) => s.nodeFilters);
  const edgeFilters = useStore((s: any) => s.edgeFilters);
  const setNodeFilters = useStore((s: any) => s.setNodeFilters);
  const setEdgeFilters = useStore((s: any) => s.setEdgeFilters);
  const resetFilters = useStore((s: any) => s.resetFilters);

  const toggleEdgeType = (t: string) => {
    const current = edgeFilters.edgeTypes;
    const next = current.includes(t)
      ? current.filter((x: string) => x !== t)
      : [...current, t];
    setEdgeFilters({ edgeTypes: next });
  };

  return (
    <div className="panel filter-panel">
      <div className="filter-header">
        <h3>Filters</h3>
        <button className="btn-sm" onClick={resetFilters}>
          Reset
        </button>
      </div>

      {/* ── Node Filters ──────────────────────────────────────────── */}
      <h4>Node Types</h4>
      <div className="filter-group">
        <label className="filter-check">
          <input
            type="checkbox"
            checked={nodeFilters.showUsers}
            onChange={() => setNodeFilters({ showUsers: !nodeFilters.showUsers })}
          />
          <span className="filter-dot" style={{ background: '#2563eb' }} />
          Users
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={nodeFilters.showGroups}
            onChange={() => setNodeFilters({ showGroups: !nodeFilters.showGroups })}
          />
          <span className="filter-dot" style={{ background: '#059669' }} />
          Groups
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={nodeFilters.showServers}
            onChange={() => setNodeFilters({ showServers: !nodeFilters.showServers })}
          />
          <span className="filter-dot" style={{ background: '#dc6b20' }} />
          Servers
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={nodeFilters.showComputers}
            onChange={() => setNodeFilters({ showComputers: !nodeFilters.showComputers })}
          />
          <span className="filter-dot" style={{ background: '#d97706' }} />
          Computers
        </label>
      </div>

      <div className="filter-group">
        <label className="filter-check">
          <input
            type="checkbox"
            checked={nodeFilters.highValueOnly}
            onChange={() => setNodeFilters({ highValueOnly: !nodeFilters.highValueOnly })}
          />
          <span className="filter-dot" style={{ background: '#dc2626' }} />
          High-Value Only
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={nodeFilters.pathNodesOnly}
            onChange={() => setNodeFilters({ pathNodesOnly: !nodeFilters.pathNodesOnly })}
          />
          <span className="filter-dot" style={{ background: '#ff6b00' }} />
          Path Nodes Only
        </label>
      </div>

      {/* ── Edge Filters ──────────────────────────────────────────── */}
      <h4>Edge Types</h4>
      <div className="filter-group filter-group-edges">
        {EDGE_TYPES.map((t) => (
          <label key={t} className="filter-check filter-check-sm">
            <input
              type="checkbox"
              checked={edgeFilters.edgeTypes.includes(t)}
              onChange={() => toggleEdgeType(t)}
            />
            {t}
          </label>
        ))}
      </div>

      <h4>Edge Weight</h4>
      <div className="filter-slider">
        <label>Min Weight: {edgeFilters.minWeight}</label>
        <input
          type="range"
          min={0}
          max={10}
          value={edgeFilters.minWeight}
          onChange={(e) => setEdgeFilters({ minWeight: parseInt(e.target.value) })}
        />
      </div>

      <label className="filter-check" style={{ marginTop: 8 }}>
        <input
          type="checkbox"
          checked={edgeFilters.hideAllEdges}
          onChange={() => setEdgeFilters({ hideAllEdges: !edgeFilters.hideAllEdges })}
        />
        Hide All Edges
      </label>
    </div>
  );
}
