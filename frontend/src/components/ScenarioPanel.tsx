/* ── What-If Scenario Panel — 6 scenarios (offensive + defensive) ──── */

import { useStore } from '../store';
import type { MutationDef } from '../types';

interface ScenarioDef {
  id: string;
  category: 'offensive' | 'defensive';
  label: string;
  desc: string;
  detail: string;
  mutations: MutationDef[];
}

const SCENARIOS: ScenarioDef[] = [
  /* ── Offensive: "What if an attacker gains…" ────────────────────── */
  {
    id: 'A',
    category: 'offensive',
    label: 'What if Mudrek joins ServerAdmins?',
    desc: 'Mudrek → MemberOf → ServerAdmins → AdminTo → DC01',
    detail:
      'Mudrek joins ServerAdmins, gaining AdminTo on FileServer and DC01. ' +
      'Opens a direct 3-hop escalation path.',
    mutations: [
      { type: 'addEdge', source: 'Mudrek', relation: 'MemberOf', target: 'ServerAdmins', weight: 3 },
    ],
  },
  {
    id: 'B',
    category: 'offensive',
    label: 'What if Arselan has GenericAll on DomainAdmins?',
    desc: 'Arselan → GenericAll → DomainAdmins → AdminTo → DC01',
    detail:
      'Arselan gets GenericAll on DomainAdmins — he can add himself to DA ' +
      'and DCSync the domain without needing Mutaz.',
    mutations: [
      { type: 'addEdge', source: 'Arselan', relation: 'GenericAll', target: 'DomainAdmins', weight: 9 },
    ],
  },
  {
    id: 'C',
    category: 'offensive',
    label: 'What if Workstation01 has a session of Mutaz?',
    desc: 'WS01 → HasSession → Mutaz → GenericAll → DomainAdmins',
    detail:
      'Mutaz logs into Workstation01. Anyone with AdminTo on WS01 ' +
      'can steal its creds and reach DomainAdmins.',
    mutations: [
      { type: 'addEdge', source: 'Workstation01', relation: 'HasSession', target: 'Mutaz', weight: 6 },
    ],
  },

  /* ── Defensive: "What if we remediate…" ─────────────────────────── */
  {
    id: 'D',
    category: 'defensive',
    label: 'What if we revoke Mutaz → GenericAll → DomainAdmins?',
    desc: 'Remove critical ACE (E13) — blocks the main escalation',
    detail:
      'Revoke Mutaz GenericAll ACE on DomainAdmins. This is the single ' +
      'most dangerous edge. Expected ≥60% risk reduction.',
    mutations: [{ type: 'removeEdge', edgeId: 'E13' }],
  },
  {
    id: 'E',
    category: 'defensive',
    label: 'What if we disable Mutaz entirely?',
    desc: 'Remove service account + all edges',
    detail:
      'Disable the over-privileged service account. Eliminates every ' +
      'path that chains through Mutaz.',
    mutations: [{ type: 'removeNode', nodeId: 'Mutaz' }],
  },
  {
    id: 'F',
    category: 'defensive',
    label: 'What if we remove Arselan → WriteDACL → Mutaz?',
    desc: 'Remove E14 — low-impact fix',
    detail:
      'Remove Arselan\'s WriteDACL on Mutaz. Blocks one intermediate ' +
      'link but leaves other paths open. Expected <15% reduction.',
    mutations: [{ type: 'removeEdge', edgeId: 'E14' }],
  },
];

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

  const offensive = SCENARIOS.filter((s) => s.category === 'offensive');
  const defensive = SCENARIOS.filter((s) => s.category === 'defensive');

  const activeScenarioDef = scenario
    ? SCENARIOS.find((s) => s.label === scenarioLabel)
    : null;

  return (
    <div className="panel scenario-panel">
      <h3>⚡ What-If Engine</h3>

      {/* ── Offensive scenarios ──────────────────────────────────────── */}
      <div className="scenario-category">
        <h4 className="scenario-cat-title scenario-cat-offensive">
          🔴 Offensive — "What if an attacker gains…"
        </h4>
        <div className="scenario-buttons">
          {offensive.map((s) => (
            <button
              key={s.id}
              className={`btn-scenario btn-scenario--offensive ${activeScenarioDef?.id === s.id ? 'btn-scenario--active' : ''}`}
              onClick={() => runScenario(s.id, s.label, s.mutations)}
              disabled={loading}
              title={s.detail}
            >
              <span className="scenario-btn-id">{s.id}</span>
              <div className="scenario-btn-content">
                <span className="scenario-btn-title">{s.label}</span>
                <small className="scenario-btn-path">{s.desc}</small>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Defensive scenarios ──────────────────────────────────────── */}
      <div className="scenario-category">
        <h4 className="scenario-cat-title scenario-cat-defensive">
          🟢 Defensive — "What if we remediate…"
        </h4>
        <div className="scenario-buttons">
          {defensive.map((s) => (
            <button
              key={s.id}
              className={`btn-scenario btn-scenario--defensive ${activeScenarioDef?.id === s.id ? 'btn-scenario--active' : ''}`}
              onClick={() => runScenario(s.id, s.label, s.mutations)}
              disabled={loading}
              title={s.detail}
            >
              <span className="scenario-btn-id">{s.id}</span>
              <div className="scenario-btn-content">
                <span className="scenario-btn-title">{s.label}</span>
                <small className="scenario-btn-path">{s.desc}</small>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Detailed Results ─────────────────────────────────────────── */}
      {scenario && (
        <div className={`scenario-result ${activeScenarioDef?.category === 'offensive' ? 'scenario-result--offensive' : 'scenario-result--defensive'}`}>
          <div className="scenario-result-header">
            <h4>{scenarioLabel}</h4>
            {(() => {
              const isOff = activeScenarioDef?.category === 'offensive';
              const badge = impactBadge(scenario.delta.riskReductionPercent, isOff || false);
              return <span className={`impact-badge ${badge.cls}`}>{badge.label}</span>;
            })()}
          </div>

          {scenarioHighlight && (
            <div className="scenario-vis-hint">
              🔍 Showing top surviving path on graph
              {scenarioHighlight.removedEdgeIds.length > 0 && (
                <span> · Removed edges shown as dashed red</span>
              )}
            </div>
          )}

          {/* Mutation info */}
          {activeScenarioDef && (
            <div className="scenario-mutation-info">
              {activeScenarioDef.mutations.map((m, i) => (
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
