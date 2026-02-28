/* ── ReactFlow Graph View — with cluster, filter, focus, animation ──── */

import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useStore } from '../store';
import IconNode from './IconNode';

/* ── Hand-tuned topology layout — minimises edge crossings ────────── */
const NODE_WIDTH = 190;
const NODE_HEIGHT = 78;

/*
 * Manually positioned to reduce edge intersections.
 * DC01 at the top (crown jewel), privilege tiers flow downward,
 * Arselan centred (most connections), Mudrek at bottom (lowest priv).
 */
const POSITION_MAP: Record<string, { x: number; y: number }> = {
  DC01:          { x: 750,  y: 80  },   // top — Domain Controller
  DomainAdmins:  { x: 380,  y: 260 },   // upper-left
  Sultan:        { x: 1100, y: 260 },   // upper-right
  Mutaz:         { x: 180,  y: 480 },   // left-centre
  ServerAdmins:  { x: 430,  y: 680 },   // centre-left lower
  FileServer:    { x: 130,  y: 820 },   // far lower-left
  Arselan:       { x: 780,  y: 560 },   // centre (hub node)
  HelpDesk:      { x: 480,  y: 930 },   // lower centre-left
  Workstation01: { x: 1150, y: 780 },   // lower-right
  Mudrek:        { x: 960,  y: 1080 },  // bottom — lowest privilege
};

function layoutGraph(
  rawNodes: Node[],
  rawEdges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes = rawNodes.map((n) => {
    const pos = POSITION_MAP[n.id];
    if (pos) {
      return { ...n, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } };
    }
    // Fallback for unknown nodes — place them to the right
    return { ...n, position: { x: 1300, y: 500 } };
  });

  return { nodes, edges: rawEdges };
}

/* ── Custom node types ───────────────────────────────────────────────── */
const nodeTypes = { iconNode: IconNode };

/* ── Relation → colour map ───────────────────────────────────────────── */
const EDGE_COLOURS: Record<string, string> = {
  MemberOf: '#10b981',
  AdminTo: '#ef4444',
  HasSession: '#f59e0b',
  CanRDP: '#8b5cf6',
  GenericAll: '#ec4899',
  WriteDacl: '#f97316',
  WriteDACL: '#f97316',
  Owns: '#14b8a6',
  ForceChangePassword: '#6366f1',
  ReadLAPSPassword: '#a855f7',
  AllExtendedRights: '#e11d48',
  DCSync: '#dc2626',
};

/* ── Subnet colors for cluster nodes ─────────────────────────────────── */
const SUBNET_COLORS: Record<string, string> = {
  'subnet-1': '#2563eb',
  'subnet-2': '#059669',
  'subnet-3': '#d97706',
  'subnet-4': '#8b5cf6',
  'subnet-5': '#dc2626',
};

/* ─────────────────────────────────────────────────────────────────────── */
export default function GraphView() {
  const storeNodes = useStore((s: any) => s.nodes);
  const storeEdges = useStore((s: any) => s.edges);
  const subnets = useStore((s: any) => s.subnets);
  const selectedPathId = useStore((s: any) => s.selectedPathId);
  const analysis = useStore((s: any) => s.analysis);
  const scenarioHighlight = useStore((s: any) => s.scenarioHighlight);

  /* Cluster/Subnet state */
  const clusterView = useStore((s: any) => s.clusterView);
  const expandedSubnets = useStore((s: any) => s.expandedSubnets);
  const toggleSubnet = useStore((s: any) => s.toggleSubnet);

  /* Filters */
  const nodeFilters = useStore((s: any) => s.nodeFilters);
  const edgeFilters = useStore((s: any) => s.edgeFilters);

  /* Focus mode */
  const focusNode = useStore((s: any) => s.focusNode);
  const focusNodes = useStore((s: any) => s.focusNodes);
  const focusEdges = useStore((s: any) => s.focusEdges);
  const setFocusNode = useStore((s: any) => s.setFocusNode);

  /* Animation */
  const animatingPathId = useStore((s: any) => s.animatingPathId);
  const animationStep = useStore((s: any) => s.animationStep);

  /* ── Determine which nodes/edges to use (focus overrides all) ──────── */
  const { activeNodes, activeEdges } = useMemo(() => {
    if (focusNode && focusNodes.length > 0) {
      return { activeNodes: focusNodes, activeEdges: focusEdges };
    }
    return { activeNodes: storeNodes, activeEdges: storeEdges };
  }, [focusNode, focusNodes, focusEdges, storeNodes, storeEdges]);

  /* ── Apply node filters ────────────────────────────────────────────── */
  const filteredNodes = useMemo(() => {
    let nodes = activeNodes;

    if (nodeFilters.highValueOnly) {
      nodes = nodes.filter((n: any) => n.highValue);
    }

    if (!nodeFilters.showUsers) nodes = nodes.filter((n: any) => n.type !== 'User');
    if (!nodeFilters.showGroups) nodes = nodes.filter((n: any) => n.type !== 'Group');
    if (!nodeFilters.showServers) nodes = nodes.filter((n: any) => n.type !== 'Server');
    if (!nodeFilters.showComputers) nodes = nodes.filter((n: any) => n.type !== 'Computer');

    if (nodeFilters.pathNodesOnly && analysis) {
      const pathNodeSet = new Set<string>();
      analysis.paths.forEach((p: any) => p.nodes.forEach((n: string) => pathNodeSet.add(n)));
      nodes = nodes.filter((n: any) => pathNodeSet.has(n.name));
    }

    return nodes;
  }, [activeNodes, nodeFilters, analysis]);

  /* ── Apply edge filters ────────────────────────────────────────────── */
  const filteredEdges = useMemo(() => {
    if (edgeFilters.hideAllEdges) return [];

    const nodeNames = new Set(filteredNodes.map((n: any) => n.name));
    let edges = activeEdges.filter((e: any) =>
      nodeNames.has(e.source) && nodeNames.has(e.target)
    );

    edges = edges.filter((e: any) => edgeFilters.edgeTypes.includes(e.relation));
    edges = edges.filter((e: any) => e.weight >= edgeFilters.minWeight);

    return edges;
  }, [activeEdges, filteredNodes, edgeFilters]);

  /* ── Build highlighted sets ────────────────────────────────────────── */
  const { hlNodes, hlEdges, removedEdges, animActiveNode, animActiveEdge } = useMemo(() => {
    const hlN = new Set<string>();
    const hlE = new Set<string>();
    const rmE = new Set<string>();
    let animNode: string | null = null;
    let animEdge: string | null = null;

    if (scenarioHighlight) {
      scenarioHighlight.nodeNames.forEach((n: string) => hlN.add(n));
      scenarioHighlight.edgeIds.forEach((e: string) => hlE.add(e));
      scenarioHighlight.removedEdgeIds.forEach((e: string) => rmE.add(e));
    } else if (animatingPathId && analysis) {
      // Animation mode: highlight up to current step
      const path = analysis.paths.find((p: any) => p.pathId === animatingPathId);
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
      const path = analysis.paths.find((p: any) => p.pathId === selectedPathId);
      if (path) {
        path.nodes.forEach((n: string) => hlN.add(n));
        path.edges.forEach((e: any) => hlE.add(e.edgeId));
      }
    }

    return { hlNodes: hlN, hlEdges: hlE, removedEdges: rmE, animActiveNode: animNode, animActiveEdge: animEdge };
  }, [selectedPathId, analysis, scenarioHighlight, animatingPathId, animationStep]);

  /* ── Build cluster view nodes / edges ──────────────────────────────── */
  const { clusterNodes, clusterEdges } = useMemo(() => {
    if (!clusterView) return { clusterNodes: null, clusterEdges: null };

    const subnetNodeMap: Record<string, any[]> = {};
    const noSubnet: any[] = [];

    filteredNodes.forEach((n: any) => {
      if (n.subnet) {
        if (!subnetNodeMap[n.subnet]) subnetNodeMap[n.subnet] = [];
        subnetNodeMap[n.subnet].push(n);
      } else {
        noSubnet.push(n);
      }
    });

    const rfNodes: Node[] = [];
    const nodeToSubnet: Record<string, string> = {};

    // Add subnet cluster nodes or expanded nodes
    subnets.forEach((sub: any) => {
      const members = subnetNodeMap[sub.id] || [];
      if (expandedSubnets.has(sub.id)) {
        // Show individual nodes
        members.forEach((n: any) => {
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
            },
            position: { x: 0, y: 0 },
          });
        });
      } else {
        // Show subnet cluster node
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
        members.forEach((n: any) => { nodeToSubnet[n.name] = sub.id; });
      }
    });

    // Add non-subnet nodes
    noSubnet.forEach((n: any) => {
      rfNodes.push({
        id: n.name,
        type: 'iconNode',
        data: {
          label: n.name,
          nodeType: n.type,
          highValue: n.highValue,
          highlighted: hlNodes.has(n.name),
          animActive: n.name === animActiveNode,
        },
        position: { x: 0, y: 0 },
      });
    });

    // Build edges for cluster view
    const validIds = new Set(rfNodes.map((n) => n.id));
    const rfEdges: Edge[] = [];
    const edgeSeen = new Set<string>();

    filteredEdges.forEach((e: any) => {
      let src = e.source;
      let tgt = e.target;

      // Map to cluster node if collapsed
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

      rfEdges.push({
        id: e.id,
        source: src,
        target: tgt,
        type: 'default',
        label: e.relation,
        animated: isHL,
        style: {
          stroke: isRemoved ? '#ef4444' : isHL ? '#facc15' : colour,
          strokeWidth: isHL ? 4 : isRemoved ? 3 : 2.5,
          opacity: hlNodes.size > 0 && !isHL && !isRemoved ? 0.12 : 1,
          strokeDasharray: isRemoved ? '8 4' : undefined,
        },
        labelStyle: { fontSize: 12, fontWeight: 600, fill: hlNodes.size > 0 && !isHL ? '#94a3b8' : '#e1e4ed' },
        labelBgStyle: { fill: '#0f1117', fillOpacity: 0.85 },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22, color: isRemoved ? '#ef4444' : isHL ? '#facc15' : colour },
      });
    });

    return { clusterNodes: rfNodes, clusterEdges: rfEdges };
  }, [clusterView, filteredNodes, filteredEdges, subnets, expandedSubnets, hlNodes, hlEdges, removedEdges, animActiveNode]);

  /* ── Convert store data → ReactFlow shapes (normal view) ───────────── */
  const { rfNodes, rfEdges } = useMemo(() => {
    if (clusterView && clusterNodes) {
      return { rfNodes: clusterNodes, rfEdges: clusterEdges || [] };
    }

    const hasHL = hlNodes.size > 0 || hlEdges.size > 0 || removedEdges.size > 0;

    const rfN: Node[] = filteredNodes.map((n: any) => ({
      id: n.name,
      type: 'iconNode',
      data: {
        label: n.name,
        nodeType: n.type,
        highValue: n.highValue,
        highlighted: hasHL ? hlNodes.has(n.name) : false,
        animActive: n.name === animActiveNode,
      },
      position: { x: 0, y: 0 },
    }));

    if (edgeFilters.hideAllEdges) {
      return { rfNodes: rfN, rfEdges: [] };
    }

    const rfE: Edge[] = filteredEdges.map((e: any) => {
      const isHL = hlEdges.has(e.id);
      const isRemoved = removedEdges.has(e.id);
      const isAnimEdge = e.id === animActiveEdge;
      const colour = EDGE_COLOURS[e.relation] ?? '#64748b';

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'default',
        label: e.relation,
        animated: isHL || isAnimEdge,
        style: {
          stroke: isRemoved ? '#ef4444' : isAnimEdge ? '#00ff88' : isHL ? '#facc15' : colour,
          strokeWidth: isAnimEdge ? 5 : isHL ? 4 : isRemoved ? 3 : 2.5,
          opacity: hasHL && !isHL && !isRemoved ? 0.12 : 1,
          strokeDasharray: isRemoved ? '8 4' : undefined,
        },
        labelStyle: {
          fontSize: 12,
          fontWeight: 600,
          fill: hasHL && !isHL && !isRemoved ? '#94a3b8' : '#e1e4ed',
        },
        labelBgStyle: { fill: '#0f1117', fillOpacity: 0.85 },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22, color: isRemoved ? '#ef4444' : isHL ? '#facc15' : colour },
      };
    });

    return { rfNodes: rfN, rfEdges: rfE };
  }, [filteredNodes, filteredEdges, hlNodes, hlEdges, removedEdges, animActiveNode, animActiveEdge, clusterView, clusterNodes, clusterEdges, edgeFilters.hideAllEdges]);

  /* Apply radial layout (memoized) */
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => (rfNodes.length > 0 ? layoutGraph(rfNodes, rfEdges) : { nodes: rfNodes, edges: rfEdges }),
    [rfNodes, rfEdges],
  );

  /* ReactFlow state */
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  const onInit = useCallback((instance: any) => {
    setTimeout(() => instance.fitView({ padding: 0.15 }), 100);
  }, []);

  const onNodeClick = useCallback((_: any, node: any) => {
    // Handle cluster node click
    if (node.data?.isCluster && node.data?.subnetId) {
      toggleSubnet(node.data.subnetId);
      return;
    }
    // Double-click sets focus (single click handled by ReactFlow)
  }, [toggleSubnet]);

  const onNodeDoubleClick = useCallback((_: any, node: any) => {
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
      <Background color="#1e293b" gap={40} size={1.5} />
      <Controls />
      <MiniMap
        nodeStrokeWidth={3}
        nodeColor={(n) => {
          if (n.data?.isCluster) return SUBNET_COLORS[n.data.subnetId] || '#6b7194';
          if (n.data?.animActive) return '#00ff88';
          if (n.data?.highValue) return '#dc2626';
          if (n.data?.highlighted) return '#ff6b00';
          return '#3b82f6';
        }}
        maskColor="rgba(15, 23, 42, 0.7)"
        style={{ background: '#1e293b' }}
      />
    </ReactFlow>
  );
}
