/* ── Analysis Configuration Panel ───────────────────────────────────── */

import { useState, useEffect } from 'react';
import { useStore } from '../store';

export default function AnalysisPanel() {
  const runAnalysis = useStore((s: any) => s.runAnalysis);
  const startOptions = useStore((s: any) => s.startOptions);
  const nodes = useStore((s: any) => s.nodes);
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState('DC01');

  // Initialize selected when startOptions load
  useEffect(() => {
    if (startOptions.length > 0 && selected.length === 0) {
      setSelected(startOptions.slice(0, 4));
    }
  }, [startOptions]);

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  };

  const dcNodes = nodes.filter((n: any) => n.name.startsWith('DC') || n.privilegeLevel === 'Domain Controller');

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
            <option key={n.name} value={n.name}>{n.name} ({n.privilegeLevel || 'DC'})</option>
          )) : (
            <option value="DC01">DC01 (Domain Controller)</option>
          )}
        </select>
      </div>
      <button
        className="btn-primary"
        onClick={() => runAnalysis(selected, target)}
        disabled={selected.length === 0}
      >
        &#9654; Analyze Attack Paths
      </button>
    </div>
  );
}
