/* ── ReactFlow Graph View — with cluster, filter, focus, animation ──── */

import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  useEdgesState,
  useNodesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useStore } from '../store';
import IconNode from './IconNode';

/* ── Automatic tier + subnet layout ─────────────────────────────── */
const H_GAP = 250;
const V_GAP = 200;

function getNodeTier(data) {
  const priv = (data.privilegeLevel || '').toLowerCase();
  const type = (data.nodeType || '').toLowerCase();
  if (priv === 'domain controller') return 0;
  if (data.highValue && (type === 'group' || type === 'server')) return 1;
  if (type === 'group' || type === 'computer' || type === 'server') return 2;
  return 3;
}

function layoutGraph(rawNodes, rawEdges) {
  if (rawNodes.length === 0) return { nodes: rawNodes, edges: rawEdges };

  const clusterNodes = rawNodes.filter((n) => n.data?.isCluster);
  if (clusterNodes.length > 0) {
    const nonCluster = rawNodes.filter((n) => !n.data?.isCluster);
    const placed = clusterNodes.map((n, i) => ({
      ...n,
      position: { x: i * 520, y: 60 },
    }));
    nonCluster.forEach((n, i) => {
      placed.push({ ...n, position: { x: i * H_GAP, y: 320 } });
    });
    return { nodes: placed, edges: rawEdges };
  }

  const subnetNodes = rawNodes.filter((n) => n.data?.subnet);
  const userNodes   = rawNodes.filter((n) => !n.data?.subnet);

  const subnetTierMap = {};
  subnetNodes.forEach((n) => {
    const s = n.data.subnet;
    const t = getNodeTier(n.data);
    if (!subnetTierMap[s]) subnetTierMap[s] = {};
    if (!subnetTierMap[s][t]) subnetTierMap[s][t] = [];
    subnetTierMap[s][t].push(n);
  });

  const subnetIds = Object.keys(subnetTierMap).sort();

  const ZONE_SEP = 180;
  const zoneWidths = subnetIds.map((sid) => {
    const maxPerTier = Math.max(...Object.values(subnetTierMap[sid]).map((a) => a.length));
    return Math.max(maxPerTier * H_GAP, H_GAP);
  });

  const zoneStartX = [];
  let cx = 0;
  zoneWidths.forEach((w) => { zoneStartX.push(cx); cx += w + ZONE_SEP; });
  const totalZoneWidth = cx - ZONE_SEP;

  const placed = [];

  subnetIds.forEach((sid, zi) => {
    const tierMap = subnetTierMap[sid];
    const tierKeys = Object.keys(tierMap).map(Number).sort();
    const zoneW   = zoneWidths[zi];
    const zoneX   = zoneStartX[zi];

    tierKeys.forEach((tier, ti) => {
      const tierNodes = tierMap[tier];
      const rowW = (tierNodes.length - 1) * H_GAP;
      const rowX = zoneX + (zoneW - rowW) / 2;
      tierNodes.forEach((n, i) => {
        placed.push({ ...n, position: { x: rowX + i * H_GAP, y: ti * V_GAP + 60 } });
      });
    });
  });

  const maxTiers = Math.max(...subnetIds.map((sid) => Object.keys(subnetTierMap[sid]).length), 0);
  const usersTopY = maxTiers * V_GAP + V_GAP + 80;

  const USERS_PER_ROW = Math.min(8, userNodes.length);
  const userRowW  = (USERS_PER_ROW - 1) * H_GAP;
  const userStartX = Math.max(0, (totalZoneWidth - userRowW) / 2);

  userNodes.forEach((n, i) => {
    const row = Math.floor(i / USERS_PER_ROW);
    const col = i % USERS_PER_ROW;
    placed.push({
      ...n,
      position: { x: userStartX + col * H_GAP, y: usersTopY + row * 160 },
    });
  });

  return { nodes: placed, edges: rawEdges };
}

const nodeTypes = { iconNode: IconNode };

const EDGE_COLOURS = {
  MemberOf: '#10b981',
  AdminTo: '#ef4444',
  HasSession: '#f59e0b',
  CanRDP: '#8b5cf6',
  GenericAll: '#ec4899',
  WriteDacl: '#7c3aed',
  WriteDACL: '#7c3aed',
  Owns: '#14b8a6',
  ForceChangePassword: '#6366f1',
  ReadLAPSPassword: '#a855f7',
  AllExtendedRights: '#e11d48',
  DCSync: '#dc2626',
};

const SUBNET_COLORS = {
  'subnet-1': '#2563eb',
  'subnet-2': '#059669',
  'subnet-3': '#d97706',
  'subnet-4': '#8b5cf6',
  'subnet-5': '#dc2626',
};

export default function GraphView() {
  const storeNodes = useStore((s) => s.nodes);
  const storeEdges = useStore((s) => s.edges);
  const subnets = useStore((s) => s.subnets);
  const selectedPathId = useStore((s) => s.selectedPathId);
  const analysis = useStore((s) => s.analysis);
  const scenarioHighlight = useStore((s) => s.scenarioHighlight);

  const clusterView = useStore((s) => s.clusterView);
  const expandedSubnets = useStore((s) => s.expandedSubnets);
  const toggleSubnet = useStore((s) => s.toggleSubnet);

  const nodeFilters = useStore((s) => s.nodeFilters);
  const edgeFilters = useStore((s) => s.edgeFilters);

  const focusNode = useStore((s) => s.focusNode);
  const focusNodes = useStore((s) => s.focusNodes);
  const focusEdges = useStore((s) => s.focusEdges);
  const setFocusNode = useStore((s) => s.setFocusNode);

  const isolateSelectedPath = useStore((s) => s.isolateSelectedPath);

  const animatingPathId = useStore((s) => s.animatingPathId);
  const animationStep = useStore((s) => s.animationStep);

  const { activeNodes, activeEdges } = useMemo(() => {
    if (focusNode && focusNodes.length > 0) {
      return { activeNodes: focusNodes, activeEdges: focusEdges };
    }
    return { activeNodes: storeNodes, activeEdges: storeEdges };
  }, [focusNode, focusNodes, focusEdges, storeNodes, storeEdges]);

  const filteredNodes = useMemo(() => {
    if (isolateSelectedPath && selectedPathId && analysis) {
      const path = analysis.paths.find((p) => p.pathId === selectedPathId);
      if (path) {
        const pathNodeSet = new Set(path.nodes);
        return activeNodes.filter((n) => pathNodeSet.has(n.name));
      }
    }

    let nodes = activeNodes;

    if (nodeFilters.highValueOnly) {
      nodes = nodes.filter((n) => n.highValue);
    }

    if (!nodeFilters.showUsers) nodes = nodes.filter((n) => n.type !== 'User');
    if (!nodeFilters.showGroups) nodes = nodes.filter((n) => n.type !== 'Group');
    if (!nodeFilters.showServers) nodes = nodes.filter((n) => n.type !== 'Server');
    if (!nodeFilters.showComputers) nodes = nodes.filter((n) => n.type !== 'Computer');

    if (nodeFilters.pathNodesOnly && analysis) {
      const pathNodeSet = new Set();
      analysis.paths.forEach((p) => p.nodes.forEach((n) => pathNodeSet.add(n)));
      nodes = nodes.filter((n) => pathNodeSet.has(n.name));
    }

    return nodes;
  }, [activeNodes, nodeFilters, analysis, isolateSelectedPath, selectedPathId]);

  const filteredEdges = useMemo(() => {
    if (isolateSelectedPath && selectedPathId && analysis) {
      const path = analysis.paths.find((p) => p.pathId === selectedPathId);
      if (path) {
        const pathEdgeSet = new Set(path.edges.map((e) => e.edgeId));
        return activeEdges.filter((e) => pathEdgeSet.has(e.id));
      }
    }

    if (edgeFilters.hideAllEdges) return [];

    const nodeNames = new Set(filteredNodes.map((n) => n.name));
    let edges = activeEdges.filter((e) =>
      nodeNames.has(e.source) && nodeNames.has(e.target)
    );

    edges = edges.filter((e) => edgeFilters.edgeTypes.includes(e.relation));
    edges = edges.filter((e) => e.weight >= edgeFilters.minWeight);

    return edges;
  }, [activeEdges, filteredNodes, edgeFilters, isolateSelectedPath, selectedPathId, analysis]);

  const { hlNodes, hlEdges, removedEdges, animActiveNode, animActiveEdge } = useMemo(() => {
    const hlN = new Set();
    const hlE = new Set();
    const rmE = new Set();
    let animNode = null;
    let animEdge = null;

    if (scenarioHighlight) {
      scenarioHighlight.nodeNames.forEach((n) => hlN.add(n));
      scenarioHighlight.edgeIds.forEach((e) => hlE.add(e));
      scenarioHighlight.removedEdgeIds.forEach((e) => rmE.add(e));
    } else if (animatingPathId && analysis) {
      const path = analysis.paths.find((p) => p.pathId === animatingPathId);
      if (path && animationStep >= 0) {
        for (let i = 0; i <= animationStep && i < path.nodes.length; i++) {
          hlN.add(path.nodes[i]);
        }
        for (let i = 0; i < animationStep && i < path.edges.length; i++) {
          hlE.add(path.edges[i].edgeId);
        }
        animNode = path.nodes[animationStep] || null;
        if (animationStep > 0 && animationStep - 1 < path.edges.length) {
          animEdge = path.edges[animationStep - 1]?.edgeId || null;
        }
      }
    } else if (selectedPathId && analysis) {
      const path = analysis.paths.find((p) => p.pathId === selectedPathId);
      if (path) {
        path.nodes.forEach((n) => hlN.add(n));
        path.edges.forEach((e) => hlE.add(e.edgeId));
      }
    }

    return { hlNodes: hlN, hlEdges: hlE, removedEdges: rmE, animActiveNode: animNode, animActiveEdge: animEdge };
  }, [selectedPathId, analysis, scenarioHighlight, animatingPathId, animationStep]);

  const { clusterNodes, clusterEdges } = useMemo(() => {
    if (!clusterView) return { clusterNodes: null, clusterEdges: null };

    const subnetNodeMap = {};
    const noSubnet = [];

    filteredNodes.forEach((n) => {
      if (n.subnet) {
        if (!subnetNodeMap[n.subnet]) subnetNodeMap[n.subnet] = [];
        subnetNodeMap[n.subnet].push(n);
      } else {
        noSubnet.push(n);
      }
    });

    const rfNodes = [];
    const nodeToSubnet = {};

    subnets.forEach((sub) => {
      const members = subnetNodeMap[sub.id] || [];
      if (expandedSubnets.has(sub.id)) {
        members.forEach((n) => {
          nodeToSubnet[n.name] = sub.id;
          rfNodes.push({
            id: n.name,
            type: 'iconNode',
            data: {
              label: n.name,
              nodeType: n.type,
              highValue: n.highValue,
              highlighted: hlNodes.has(n.name),
              animActive: n.name === animActiveNode,
              subnet: n.subnet || '',
              privilegeLevel: n.privilegeLevel || '',
            },
            position: { x: 0, y: 0 },
          });
        });
      } else {
        rfNodes.push({
          id: `cluster-${sub.id}`,
          type: 'iconNode',
          data: {
            label: `${sub.label} (${members.length})`,
            nodeType: 'Subnet',
            highValue: false,
            highlighted: false,
            isCluster: true,
            subnetId: sub.id,
          },
          position: { x: 0, y: 0 },
        });
        members.forEach((n) => { nodeToSubnet[n.name] = sub.id; });
      }
    });

    noSubnet.forEach((n) => {
      rfNodes.push({
        id: n.name,
        type: 'iconNode',
        data: {
          label: n.name,
          nodeType: n.type,
          highValue: n.highValue,
          highlighted: hlNodes.has(n.name),
          animActive: n.name === animActiveNode,
          subnet: '',
          privilegeLevel: n.privilegeLevel || '',
        },
        position: { x: 0, y: 0 },
      });
    });

    const validIds = new Set(rfNodes.map((n) => n.id));
    const rfEdges = [];
    const edgeSeen = new Set();

    filteredEdges.forEach((e) => {
      let src = e.source;
      let tgt = e.target;

      const srcSubnet = nodeToSubnet[src];
      const tgtSubnet = nodeToSubnet[tgt];
      if (srcSubnet && !expandedSubnets.has(srcSubnet)) src = `cluster-${srcSubnet}`;
      if (tgtSubnet && !expandedSubnets.has(tgtSubnet)) tgt = `cluster-${tgtSubnet}`;

      if (!validIds.has(src) || !validIds.has(tgt) || src === tgt) return;

      const key = `${src}-${tgt}-${e.relation}`;
      if (edgeSeen.has(key)) return;
      edgeSeen.add(key);

      const colour = EDGE_COLOURS[e.relation] ?? '#64748b';
      const isHL = hlEdges.has(e.id);
      const isRemoved = removedEdges.has(e.id);

      const strokeColor = isRemoved ? '#ef4444' : isHL ? '#2563eb' : colour;
      rfEdges.push({
        id: e.id,
        source: src,
        target: tgt,
        type: 'default',
        label: e.relation,
        animated: isHL,
        style: {
          stroke: strokeColor,
          strokeWidth: isHL ? 5 : isRemoved ? 3 : 2,
          opacity: hlNodes.size > 0 && !isHL && !isRemoved ? 0.08 : 1,
          strokeDasharray: isRemoved ? '8 4' : undefined,
        },
        labelStyle: { fontSize: 11, fontWeight: 700, fill: '#ffffff' },
        labelBgStyle: {
          fill: isHL ? '#2563eb' : colour,
          fillOpacity: hlNodes.size > 0 && !isHL && !isRemoved ? 0.2 : 0.95,
        },
        labelBgPadding: [7, 4],
        labelBgBorderRadius: 6,
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: strokeColor },
      });
    });

    return { clusterNodes: rfNodes, clusterEdges: rfEdges };
  }, [clusterView, filteredNodes, filteredEdges, subnets, expandedSubnets, hlNodes, hlEdges, removedEdges, animActiveNode]);

  const { rfNodes, rfEdges } = useMemo(() => {
    if (clusterView && clusterNodes) {
      return { rfNodes: clusterNodes, rfEdges: clusterEdges || [] };
    }

    const hasHL = hlNodes.size > 0 || hlEdges.size > 0 || removedEdges.size > 0;

    const rfN = filteredNodes.map((n) => ({
      id: n.name,
      type: 'iconNode',
      data: {
        label: n.name,
        nodeType: n.type,
        highValue: n.highValue,
        highlighted: hasHL ? hlNodes.has(n.name) : false,
        animActive: n.name === animActiveNode,
        subnet: n.subnet || '',
        privilegeLevel: n.privilegeLevel || '',
      },
      position: { x: 0, y: 0 },
    }));

    if (edgeFilters.hideAllEdges) {
      return { rfNodes: rfN, rfEdges: [] };
    }

    const rfE = filteredEdges.map((e) => {
      const isHL = hlEdges.has(e.id);
      const isRemoved = removedEdges.has(e.id);
      const isAnimEdge = e.id === animActiveEdge;
      const colour = EDGE_COLOURS[e.relation] ?? '#64748b';

      const strokeColor = isRemoved ? '#ef4444' : isAnimEdge ? '#059669' : isHL ? '#2563eb' : colour;
      const pillColor   = isAnimEdge ? '#059669' : isHL ? '#2563eb' : colour;
      const faded = hasHL && !isHL && !isRemoved;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'default',
        label: e.relation,
        animated: isHL || isAnimEdge,
        style: {
          stroke: strokeColor,
          strokeWidth: isAnimEdge ? 6 : isHL ? 5 : isRemoved ? 3 : 2,
          opacity: faded ? 0.08 : 1,
          strokeDasharray: isRemoved ? '8 4' : undefined,
        },
        labelStyle: {
          fontSize: 11,
          fontWeight: 700,
          fill: '#ffffff',
        },
        labelBgStyle: {
          fill: pillColor,
          fillOpacity: faded ? 0.2 : 0.95,
        },
        labelBgPadding: [7, 4],
        labelBgBorderRadius: 6,
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: strokeColor },
      };
    });

    return { rfNodes: rfN, rfEdges: rfE };
  }, [filteredNodes, filteredEdges, hlNodes, hlEdges, removedEdges, animActiveNode, animActiveEdge, clusterView, clusterNodes, clusterEdges, edgeFilters.hideAllEdges]);

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => (rfNodes.length > 0 ? layoutGraph(rfNodes, rfEdges) : { nodes: rfNodes, edges: rfEdges }),
    [rfNodes, rfEdges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  const onInit = useCallback((instance) => {
    setTimeout(() => instance.fitView({ padding: 0.15 }), 100);
  }, []);

  const onNodeClick = useCallback((_, node) => {
    if (node.data?.isCluster && node.data?.subnetId) {
      toggleSubnet(node.data.subnetId);
      return;
    }
  }, [toggleSubnet]);

  const onNodeDoubleClick = useCallback((_, node) => {
    if (!node.data?.isCluster) {
      setFocusNode(node.id);
    }
  }, [setFocusNode]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onInit={onInit}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      fitView
      connectionMode={ConnectionMode.Loose}
      minZoom={0.05}
      maxZoom={3}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#c8d0e0" gap={40} size={1} />
      <Controls />
      <MiniMap
        nodeStrokeWidth={3}
        nodeColor={(n) => {
          if (n.data?.isCluster) return SUBNET_COLORS[n.data.subnetId] || '#94a3b8';
          if (n.data?.animActive) return '#059669';
          if (n.data?.highValue) return '#dc2626';
          if (n.data?.highlighted) return '#2563eb';
          return '#2563eb';
        }}
        maskColor="rgba(200,208,224,0.55)"
        style={{ background: '#eaedf5', border: '1px solid #d4d9e8' }}
      />
    </ReactFlow>
  );
}
