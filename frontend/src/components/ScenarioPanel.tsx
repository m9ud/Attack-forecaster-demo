/* ── What-If Scenario Panel — dynamic presets loaded from dataset ──── */

import { useStore } from '../store';
import { ZapIcon, ShieldIcon, SearchIcon } from './Icons';

/* ── Delta helpers ──────────────────────────────────────────────────── */
function deltaLabel(before: number, after: number): string {
  const diff = after - before;
  if (diff === 0) return '—';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function deltaClass(before: number, after: number): string {
  if (after > before) return 'delta-worse';
  if (after < before) return 'delta-better';
  return 'delta-same';
}

function impactBadge(pct: number, isOffensive: boolean): { label: string; cls: string } {
  const abs = Math.abs(pct);
  if (isOffensive) {
    if (abs >= 20) return { label: 'HIGH RISK', cls: 'impact-high-risk' };
    if (abs >= 8) return { label: 'MEDIUM RISK', cls: 'impact-med-risk' };
    return { label: 'LOW RISK', cls: 'impact-low-risk' };
  }
  if (abs >= 50) return { label: 'HIGH IMPACT', cls: 'impact-high' };
  if (abs >= 20) return { label: 'MEDIUM IMPACT', cls: 'impact-medium' };
  return { label: 'LOW IMPACT', cls: 'impact-low' };
}

function riskBar(value: number, max: number, color: string) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="risk-bar-track">
      <div className="risk-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function ScenarioPanel() {
  const scenario = useStore((s: any) => s.scenario);
  const scenarioLabel = useStore((s: any) => s.scenarioLabel);
  const runScenario = useStore((s: any) => s.runScenario);
  const scenarioHighlight = useStore((s: any) => s.scenarioHighlight);
  const loading = useStore((s: any) => s.loading);
  const scenarioPresets = useStore((s: any) => s.scenarioPresets) as Record<string, { label: string; description: string; mutations: any[] }>;

  // Derive offensive/defensive from mutation types
  const presetEntries = Object.entries(scenarioPresets);
  const offensive = presetEntries.filter(([, p]) => p.mutations.some((m) => m.type === 'addEdge'));
  const defensive = presetEntries.filter(([, p]) => p.mutations.every((m) => m.type !== 'addEdge'));

  const activeId = scenario ? Object.entries(scenarioPresets).find(([, p]) => p.label === scenarioLabel)?.[0] : null;
  const activePreset = activeId ? scenarioPresets[activeId] : null;
  const isActiveOffensive = activePreset?.mutations.some((m: any) => m.type === 'addEdge') ?? false;

  return (
    <div className="panel scenario-panel">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'var(--accent)', flexShrink: 0, display: 'flex' }}>
          <ZapIcon size={11} />
        </span>
        What-If Engine
      </h3>

      {presetEntries.length === 0 && (
        <p className="scenario-empty">No scenarios defined in the loaded dataset.</p>
      )}

      {/* ── Offensive scenarios ──────────────────────────────────────── */}
      {offensive.length > 0 && (
        <div className="scenario-category">
          <h4 className="scenario-cat-title scenario-cat-offensive">
            <ZapIcon size={13} /> Offensive — "What if an attacker gains…"
          </h4>
          <div className="scenario-buttons">
            {offensive.map(([id, p]) => (
              <button
                key={id}
                className={`btn-scenario btn-scenario--offensive ${activeId === id ? 'btn-scenario--active' : ''}`}
                onClick={() => runScenario(id, p.label, p.mutations)}
                disabled={loading}
                title={p.description}
              >
                <span className="scenario-btn-id">{id}</span>
                <div className="scenario-btn-content">
                  <span className="scenario-btn-title">{p.label}</span>
                  <small className="scenario-btn-path">{p.description}</small>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Defensive scenarios ──────────────────────────────────────── */}
      {defensive.length > 0 && (
        <div className="scenario-category">
          <h4 className="scenario-cat-title scenario-cat-defensive">
            <ShieldIcon size={13} /> Defensive — "What if we remediate…"
          </h4>
          <div className="scenario-buttons">
            {defensive.map(([id, p]) => (
              <button
                key={id}
                className={`btn-scenario btn-scenario--defensive ${activeId === id ? 'btn-scenario--active' : ''}`}
                onClick={() => runScenario(id, p.label, p.mutations)}
                disabled={loading}
                title={p.description}
              >
                <span className="scenario-btn-id">{id}</span>
                <div className="scenario-btn-content">
                  <span className="scenario-btn-title">{p.label}</span>
                  <small className="scenario-btn-path">{p.description}</small>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Detailed Results ─────────────────────────────────────────── */}
      {scenario && (
        <div className={`scenario-result ${isActiveOffensive ? 'scenario-result--offensive' : 'scenario-result--defensive'}`}>
          <div className="scenario-result-header">
            <h4>{scenarioLabel}</h4>
            {(() => {
              const badge = impactBadge(scenario.delta.riskReductionPercent, isActiveOffensive);
              return <span className={`impact-badge ${badge.cls}`}>{badge.label}</span>;
            })()}
          </div>

          {scenarioHighlight && (
            <div className="scenario-vis-hint">
              <SearchIcon size={11} /> Showing top surviving path on graph
              {scenarioHighlight.removedEdgeIds.length > 0 && (
                <span> · Removed edges shown as dashed red</span>
              )}
            </div>
          )}

          {/* Mutation info */}
          {activePreset && (
            <div className="scenario-mutation-info">
              {activePreset.mutations.map((m: any, i: number) => (
                <span key={i} className={`mutation-chip mutation-chip--${m.type}`}>
                  {m.type === 'addEdge' && `+ ${m.source} → ${m.relation} → ${m.target}`}
                  {m.type === 'removeEdge' && `− Remove edge ${m.edgeId}`}
                  {m.type === 'removeNode' && `× Remove node ${m.nodeId}`}
                </span>
              ))}
            </div>
          )}

          {/* ── Metric comparison rows ─────────────────────────────── */}
          <div className="scenario-metrics">
            {/* Paths */}
            <div className="metric-row">
              <span className="metric-label">Attack Paths</span>
              <div className="metric-values">
                <span className="metric-before">{scenario.before.totalPaths}</span>
                <span className="metric-arrow">→</span>
                <span className={`metric-after ${deltaClass(scenario.before.totalPaths, scenario.after.totalPaths)}`}>
                  {scenario.after.totalPaths}
                </span>
                <span className={`metric-delta ${deltaClass(scenario.before.totalPaths, scenario.after.totalPaths)}`}>
                  ({deltaLabel(scenario.before.totalPaths, scenario.after.totalPaths)})
                </span>
              </div>
            </div>

            {/* Risk with visual bars */}
            <div className="metric-row">
              <span className="metric-label">Global Risk</span>
              <div className="metric-values">
                <span className="metric-before">{scenario.before.globalRisk}</span>
                <span className="metric-arrow">→</span>
                <span className={`metric-after ${deltaClass(scenario.before.globalRisk, scenario.after.globalRisk)}`}>
                  {scenario.after.globalRisk}
                </span>
                <span className={`metric-delta ${deltaClass(scenario.before.globalRisk, scenario.after.globalRisk)}`}>
                  ({deltaLabel(
                    parseFloat(scenario.before.globalRisk),
                    parseFloat(scenario.after.globalRisk),
                  )})
                </span>
              </div>
            </div>
            <div className="metric-bars">
              <div className="metric-bar-row">
                <span className="metric-bar-label">Before</span>
                {riskBar(parseFloat(scenario.before.globalRisk), Math.max(parseFloat(scenario.before.globalRisk), parseFloat(scenario.after.globalRisk)) * 1.1, '#6b7194')}
                <span className="metric-bar-val">{scenario.before.globalRisk}</span>
              </div>
              <div className="metric-bar-row">
                <span className="metric-bar-label">After</span>
                {riskBar(
                  parseFloat(scenario.after.globalRisk),
                  Math.max(parseFloat(scenario.before.globalRisk), parseFloat(scenario.after.globalRisk)) * 1.1,
                  parseFloat(scenario.after.globalRisk) > parseFloat(scenario.before.globalRisk) ? '#ef4444' : '#22c55e',
                )}
                <span className="metric-bar-val">{scenario.after.globalRisk}</span>
              </div>
            </div>

            {/* HVTs */}
            <div className="metric-row">
              <span className="metric-label">HVTs Reachable</span>
              <div className="metric-values">
                <span className="metric-before">{scenario.before.highValueTargetsReachable}</span>
                <span className="metric-arrow">→</span>
                <span className={`metric-after ${deltaClass(scenario.before.highValueTargetsReachable, scenario.after.highValueTargetsReachable)}`}>
                  {scenario.after.highValueTargetsReachable}
                </span>
                <span className={`metric-delta ${deltaClass(scenario.before.highValueTargetsReachable, scenario.after.highValueTargetsReachable)}`}>
                  ({deltaLabel(scenario.before.highValueTargetsReachable, scenario.after.highValueTargetsReachable)})
                </span>
              </div>
            </div>
          </div>

          {/* ── Main percentage display ────────────────────────────── */}
          <div className={`scenario-verdict ${
            scenario.delta.riskReductionPercent >= 50 ? 'verdict-excellent' :
            scenario.delta.riskReductionPercent >= 20 ? 'verdict-good' :
            scenario.delta.riskReductionPercent >= 0 ? 'verdict-low' :
            'verdict-worse'
          }`}>
            <span className="verdict-pct">
              {scenario.delta.riskReductionPercent >= 0
                ? `−${scenario.delta.riskReductionPercent}%`
                : `+${Math.abs(scenario.delta.riskReductionPercent)}%`}
            </span>
            <span className="verdict-label">
              {scenario.delta.riskReductionPercent >= 0
                ? 'Risk Reduction'
                : 'Risk Increase'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
