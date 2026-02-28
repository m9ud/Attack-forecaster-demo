/* ── Stats & Charts Panel — Recharts Visualizations ─────────────────── */

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { useStore } from '../store';

const COLORS = ['#2563eb', '#059669', '#d97706', '#dc6b20', '#8b5cf6', '#ec4899', '#14b8a6'];
const EDGE_COLORS: Record<string, string> = {
  GenericAll: '#dc2626',
  WriteDACL: '#f97316',
  AdminTo: '#eab308',
  HasSession: '#22c55e',
  CanRDP: '#3b82f6',
  MemberOf: '#8b5cf6',
};

/* custom dark tooltip */
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill || p.color || '#fff' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function StatsCharts() {
  const nodes = useStore((s: any) => s.nodes);
  const edges = useStore((s: any) => s.edges);
  const analysis = useStore((s: any) => s.analysis);
  const scenario = useStore((s: any) => s.scenario);

  /* Node type distribution */
  const nodeTypeDist = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach((n: any) => { counts[n.type] = (counts[n.type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [nodes]);

  /* Edge relation distribution */
  const edgeRelDist = useMemo(() => {
    const counts: Record<string, number> = {};
    edges.forEach((e: any) => { counts[e.relation] = (counts[e.relation] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [edges]);

  /* Risk distribution from analysis (top paths) */
  const riskDist = useMemo(() => {
    if (!analysis) return [];
    return analysis.top5.map((p: any) => ({
      name: p.pathId,
      risk: p.risk,
      hops: p.hops,
    }));
  }, [analysis]);

  /* Bottleneck radar (critical edges) */
  const bottleneckData = useMemo(() => {
    if (!analysis) return [];
    return analysis.criticalEdges.slice(0, 6).map((ce: any) => ({
      edge: `${ce.source.replace(/^(User_|GRP_|SRV_|WS_)/, '')}→${ce.target.replace(/^(User_|GRP_|SRV_|WS_)/, '')}`,
      pct: ce.percentOfPaths,
      count: ce.traversalCount,
    }));
  }, [analysis]);

  /* Scenario comparison bar */
  const scenarioCompare = useMemo(() => {
    if (!scenario) return [];
    return [
      { metric: 'Paths', before: scenario.before.totalPaths, after: scenario.after.totalPaths },
      { metric: 'Risk', before: Math.round(scenario.before.globalRisk), after: Math.round(scenario.after.globalRisk) },
      { metric: 'HVTs', before: scenario.before.highValueTargetsReachable, after: scenario.after.highValueTargetsReachable },
    ];
  }, [scenario]);

  if (!nodes.length) return null;

  return (
    <div className="stats-charts">
      <h3>Network Analytics</h3>

      {/* ── Row 1: Node Types + Edge Relations ──────────────────────── */}
      <div className="charts-row">
        <div className="chart-card">
          <h4>Node Distribution</h4>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={nodeTypeDist}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={60}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {nodeTypeDist.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<DarkTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend-inline">
            {nodeTypeDist.map((d, i) => (
              <span key={d.name} className="chart-legend-chip">
                <span className="chart-legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h4>Edge Types</h4>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={edgeRelDist} layout="vertical" margin={{ left: 10, right: 10 }}>
              <XAxis type="number" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} width={72} axisLine={false} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                {edgeRelDist.map((d, i) => (
                  <Cell key={i} fill={EDGE_COLORS[d.name] || COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 2: Risk + Bottleneck (only after analysis) ──────────── */}
      {analysis && (
        <div className="charts-row">
          <div className="chart-card">
            <h4>Top Path Risk Scores</h4>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={riskDist} margin={{ left: 0, right: 10 }}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="risk" radius={[4, 4, 0, 0]} barSize={24}>
                  {riskDist.map((_: any, i: number) => (
                    <Cell key={i} fill={i === 0 ? '#dc2626' : i < 3 ? '#f97316' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h4>Bottleneck Analysis</h4>
            <ResponsiveContainer width="100%" height={160}>
              <RadarChart cx="50%" cy="50%" outerRadius={55} data={bottleneckData}>
                <PolarGrid stroke="#1e2236" />
                <PolarAngleAxis dataKey="edge" tick={{ fill: '#9ca3af', fontSize: 8 }} />
                <PolarRadiusAxis tick={{ fill: '#555', fontSize: 8 }} />
                <Radar
                  name="Path %"
                  dataKey="pct"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.25}
                />
                <Tooltip content={<DarkTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Row 3: Scenario Comparison (only after scenario) ─────────── */}
      {scenario && (
        <div className="charts-row">
          <div className="chart-card chart-card-full">
            <h4>Scenario Impact: Before vs After</h4>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={scenarioCompare} margin={{ left: 0, right: 10 }}>
                <XAxis dataKey="metric" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="before" name="Before" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="after" name="After" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
            <div className="chart-legend-inline">
              <span className="chart-legend-chip">
                <span className="chart-legend-dot" style={{ background: '#3b82f6' }} />Before
              </span>
              <span className="chart-legend-chip">
                <span className="chart-legend-dot" style={{ background: '#22c55e' }} />After
              </span>
              <span className="chart-legend-chip reduction-chip">
                &minus;{scenario.delta.riskReductionPercent}% Risk
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
