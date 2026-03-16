/* ── Analysis Configuration Panel ───────────────────────────────────── */

import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { PlayIcon } from './Icons';

export default function AnalysisPanel() {
  const runAnalysis = useStore((s: any) => s.runAnalysis);
  const startOptions = useStore((s: any) => s.startOptions);
  const nodes = useStore((s: any) => s.nodes);
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState('');

  // Initialize selected when startOptions load
  useEffect(() => {
    if (startOptions.length > 0 && selected.length === 0) {
      setSelected(startOptions.slice(0, 4));
    }
  }, [startOptions]);

  useEffect(() => {
    if (nodes.length > 0 && !target) {
      const dc = nodes.find((n: any) => n.privilegeLevel === 'Domain Controller')
        ?? nodes.find((n: any) => n.highValue);
      if (dc) setTarget(dc.name);
    }
  }, [nodes]);

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  };

  const dcNodes = nodes.filter((n: any) => n.privilegeLevel === 'Domain Controller' || n.highValue);

  return (
    <div className="panel">
      <h3>Analysis Configuration</h3>
      <div className="field">
        <label>Start Nodes (low-priv users)</label>
        <div className="checkbox-group">
          {startOptions.map((n: string) => (
            <label key={n} className="checkbox-label">
              <input
                type="checkbox"
                checked={selected.includes(n)}
                onChange={() => toggle(n)}
              />
              {n.replace('User_', '')}
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Target Node</label>
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          {dcNodes.length > 0 ? dcNodes.map((n: any) => (
            <option key={n.name} value={n.name}>{n.name} ({n.privilegeLevel || n.type})</option>
          )) : (
            <option value="">(select target)</option>
          )}
        </select>
      </div>
      <button
        className="btn-primary"
        onClick={() => runAnalysis(selected, target)}
        disabled={selected.length === 0}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <PlayIcon size={14} />
        Analyze Attack Paths
      </button>
    </div>
  );
}
