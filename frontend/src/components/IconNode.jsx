import { Handle, Position } from 'reactflow';
import { useStore } from '../store';

const UserIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

// Privileged user — crown above person
const AdminIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="10" r="3.5" />
    <path d="M5 21c0-3.5 3.1-6.5 7-6.5s7 3 7 6.5" />
    <path d="M7 6l2.5 2.5L12 4l2.5 4.5L17 6" />
    <line x1="7" y1="6" x2="17" y2="6" />
  </svg>
);

// Group — two people
const GroupIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="3.5" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M2 21c0-3.8 3.1-6.5 7-6.5s7 2.7 7 6.5" />
    <path d="M17 14.5c2.5.3 5 2 5 5" />
  </svg>
);

// Server — rack with status LED
const ServerIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="7" rx="1.5" />
    <rect x="2" y="14" width="20" height="7" rx="1.5" />
    <circle cx="6.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="6.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
    <line x1="10" y1="6.5" x2="18" y2="6.5" />
    <line x1="10" y1="17.5" x2="18" y2="17.5" />
    <line x1="10" y1="19" x2="15" y2="19" />
  </svg>
);

// Workstation — monitor with stand
const ComputerIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="13" rx="2" />
    <polyline points="8 21 12 17 16 21" />
    <line x1="12" y1="17" x2="12" y2="16" />
  </svg>
);

// High-value asset shield
const ShieldIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3L4 7v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

// Domain Controller — server with crown
const DomainControllerIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="9" width="20" height="6" rx="1.5" />
    <rect x="2" y="17" width="20" height="5" rx="1.5" />
    <circle cx="6.5" cy="12" r="1" fill="currentColor" stroke="none" />
    <line x1="10" y1="12" x2="18" y2="12" />
    <path d="M7 9V7l2.5 2L12 4l2.5 5L17 7v2" />
  </svg>
);

function getIcon(nodeType, highValue, privilegeLevel) {
  if (privilegeLevel === 'Domain Controller') return <DomainControllerIcon />;
  if (highValue && nodeType === 'User') return <AdminIcon />;
  if (highValue) return <ShieldIcon />;
  switch (nodeType) {
    case 'User': return <UserIcon />;
    case 'Group': return <GroupIcon />;
    case 'Server': return <ServerIcon />;
    case 'Computer': return <ComputerIcon />;
    case 'Subnet': return <GroupIcon />;
    default: return <ServerIcon />;
  }
}

const TYPE_BG = {
  User:     'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)',
  Group:    'linear-gradient(135deg, #0284c7 0%, #075985 100%)',
  Computer: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
  Server:   'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  Subnet:   'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
};
const HV_BG = 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)';
const ANIM_ACTIVE_BG = 'linear-gradient(135deg, #059669 0%, #065f46 100%)';

export default function IconNode({ data }) {
  const openContextMenu = useStore((s) => s.openContextMenu);

  const bg = data.animActive ? ANIM_ACTIVE_BG
    : data.highValue ? HV_BG
    : (TYPE_BG[data.nodeType] ?? TYPE_BG.Server);
  const isHL = data.highlighted;
  const isAnim = data.animActive;

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!data.isCluster) {
      openContextMenu(data.label, e.clientX, e.clientY);
    }
  };

  return (
    <div
      className={`icon-node ${isHL ? 'icon-node--hl' : ''} ${data.highValue ? 'icon-node--hv' : ''} ${isAnim ? 'icon-node--anim' : ''} ${data.isCluster ? 'icon-node--cluster' : ''}`}
      style={{ background: bg }}
      onContextMenu={handleContextMenu}
    >
      <Handle type="target" position={Position.Left} className="icon-handle" />
      <Handle type="target" position={Position.Top} className="icon-handle" id="t-top" />
      <div className="icon-node__icon">
        {getIcon(data.nodeType, data.highValue, data.privilegeLevel)}
      </div>
      <div className="icon-node__label">{data.label}</div>
      {data.highValue && <div className="icon-node__badge">HVT</div>}
      <Handle type="source" position={Position.Right} className="icon-handle" />
      <Handle type="source" position={Position.Bottom} className="icon-handle" id="s-bottom" />
    </div>
  );
}
