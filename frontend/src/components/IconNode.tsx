/* ── Custom Node with SVG Icons ─────────────────────────────────────── */

import { Handle, Position } from 'reactflow';

interface IconNodeData {
  label: string;
  nodeType: string;
  highValue: boolean;
  highlighted: boolean;
  animActive?: boolean;
  isCluster?: boolean;
  subnetId?: string;
}

/* ── SVG Icons ─────────────────────────────────────────────────────── */
const UserIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const AdminIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l1.09 3.26L16 6l-2.18 2.18L14.54 12 12 10.27 9.46 12l.72-3.82L8 6l2.91-.74z" />
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
  </svg>
);

const GroupIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ServerIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

const ComputerIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const DomainControllerIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
    <path d="M12 2l1.5 2.5L12 7l-1.5-2.5z" fill="currentColor" />
  </svg>
);

function getIcon(nodeType: string, highValue: boolean, label: string) {
  if (label === 'DC01') return <DomainControllerIcon />;
  if (highValue && nodeType === 'User') return <AdminIcon />;
  if (highValue) return <ShieldIcon />;
  switch (nodeType) {
    case 'User': return <UserIcon />;
    case 'Group': return <GroupIcon />;
    case 'Server': return <ServerIcon />;
    case 'Computer': return <ComputerIcon />;
    default: return <ServerIcon />;
  }
}

const TYPE_BG: Record<string, string> = {
  User: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
  Group: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
  Computer: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
  Server: 'linear-gradient(135deg, #dc6b20 0%, #c2410c 100%)',
  Subnet: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
};
const HV_BG = 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)';
const ANIM_ACTIVE_BG = 'linear-gradient(135deg, #00ff88 0%, #059669 100%)';

export default function IconNode({ data }: { data: IconNodeData }) {
  const bg = data.animActive ? ANIM_ACTIVE_BG
    : data.highValue ? HV_BG
    : (TYPE_BG[data.nodeType] ?? TYPE_BG.Server);
  const isHL = data.highlighted;
  const isAnim = data.animActive;

  return (
    <div
      className={`icon-node ${isHL ? 'icon-node--hl' : ''} ${data.highValue ? 'icon-node--hv' : ''} ${isAnim ? 'icon-node--anim' : ''} ${data.isCluster ? 'icon-node--cluster' : ''}`}
      style={{ background: bg }}
    >
      <Handle type="target" position={Position.Left} className="icon-handle" />
      <Handle type="target" position={Position.Top} className="icon-handle" id="t-top" />
      <div className="icon-node__icon">
        {getIcon(data.nodeType, data.highValue, data.label)}
      </div>
      <div className="icon-node__label">{data.label}</div>
      {data.highValue && <div className="icon-node__badge">HVT</div>}
      <Handle type="source" position={Position.Right} className="icon-handle" />
      <Handle type="source" position={Position.Bottom} className="icon-handle" id="s-bottom" />
    </div>
  );
}
