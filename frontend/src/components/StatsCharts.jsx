/* ── Stats & Charts Panel — Recharts Visualizations ─────────────────── */

import { useMemo } from 'react';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useStore } from '../store';

const COLORS = ['#2563eb', '#059669', '#d97706', '#dc6b20', '#8b5cf6', '#ec4899', '#14b8a6'];
const EDGE_COLORS = {
  GenericAll: '#dc2626',
  WriteDACL: '#f97316',
  AdminTo: '#eab308',
  HasSession: '#22c55e',
  CanRDP: '#3b82f6',
  MemberOf: '#8b5cf6',
};

function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.color || '#fff' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function StatsCharts() {
  const edges = useStore((s) => s.edges);

  const edgeRelDist = useMemo(() => {
    const counts = {};
    edges.forEach((e) => { counts[e.relation] = (counts[e.relation] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [edges]);

  if (!edges.length) return null;

  return (
    <div className="stats-charts">
      <h3>Network Analytics</h3>

      <div className="charts-row">
        <div className="chart-card chart-card-full">
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
    </div>
  );
}
