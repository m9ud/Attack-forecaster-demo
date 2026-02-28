/* ── Focus Mode — show N-hop neighbors of selected node ─────────────── */

import { useStore } from '../store';

export default function FocusMode() {
  const focusNode = useStore((s: any) => s.focusNode);
  const focusRadius = useStore((s: any) => s.focusRadius);
  const setFocusNode = useStore((s: any) => s.setFocusNode);
  const setFocusRadius = useStore((s: any) => s.setFocusRadius);
  const nodes = useStore((s: any) => s.nodes);
  const focusNodes = useStore((s: any) => s.focusNodes);

  return (
    <div className="panel focus-panel">
      <h3>Focus Mode</h3>

      <div className="field">
        <label>Select Node</label>
        <select
          value={focusNode ?? ''}
          onChange={(e) => setFocusNode(e.target.value || null)}
        >
          <option value="">— No Focus —</option>
          {nodes.map((n: any) => (
            <option key={n.name} value={n.name}>
              {n.name} ({n.type})
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Radius: {focusRadius} hops</label>
        <input
          type="range"
          min={1}
          max={4}
          value={focusRadius}
          onChange={(e) => setFocusRadius(parseInt(e.target.value))}
          disabled={!focusNode}
        />
        <div className="radius-labels">
          <span>1</span><span>2</span><span>3</span><span>4</span>
        </div>
      </div>

      {focusNode && (
        <div className="focus-info">
          <span className="focus-badge">&#128269; Focused on: {focusNode}</span>
          <span className="focus-count">{focusNodes.length} nodes visible</span>
          <button className="btn-sm" onClick={() => setFocusNode(null)}>
            Clear Focus
          </button>
        </div>
      )}
    </div>
  );
}
