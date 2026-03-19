// src/components/graph/parseGraphToFlow.ts
import type { Node, Edge } from "@xyflow/react";
import dagre from "dagre";
import type { BackendGraphResponse } from "./mockGraphData";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 130;
// Extra padding so nodes never visually touch
const NODE_SEP = 60;
const RANK_SEP = 90;

function layoutWithDagre(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: NODE_SEP,
    ranksep: RANK_SEP,
    marginx: 40,
    marginy: 40,
    // align: "UL" keeps nodes left-aligned within rank, reduces visual clutter
  });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

function mapEntityType(backendType: string): string {
  return backendType;
}

export function parseGraphToFlow(
  backend: BackendGraphResponse,
  activePathId: string,
): { nodes: Node[]; edges: Edge[] } {
  const path = backend.paths.find((p) => p.id === activePathId);
  if (!path) return { nodes: [], edges: [] };

  const activeNodeIds = new Set(path.node_ids);

  // Student profile node
  const summaryParts = backend.student_summary.split(", ");
  const studentName = summaryParts[0] || "Student";
  const studentDegree = summaryParts.slice(1).join(", ");

  const profileNode: Node = {
    id: "__student__",
    type: "profile",
    position: { x: 0, y: 0 },
    data: {
      name: studentName,
      degree: studentDegree,
      interests: [],
    },
  };

  const filteredBackendNodes = backend.nodes.filter((n) => activeNodeIds.has(n.id));

  const rfNodes: Node[] = filteredBackendNodes.map((n) => ({
    id: n.id,
    type: "entity",
    position: { x: 0, y: 0 },
    data: {
      name: n.label,
      role: n.subtitle,
      entityType: mapEntityType(n.type),
      entityId: n.entity_id,
      matchScore: Math.round(n.confidence * 100),
      tags: n.tags,
      reasoning: n.reasoning,
    },
  }));

  const topicNodeIds = filteredBackendNodes
    .filter((n) => n.type === "topic")
    .map((n) => n.id);

  const studentEdges: Edge[] = topicNodeIds.map((tid, i) => ({
    id: `student-to-${tid}-${i}`,
    source: "__student__",
    target: tid,
    type: "smoothstep",
    style: { stroke: "hsl(142, 71%, 35%)", strokeWidth: 2 },
    animated: false,
  }));

  const rfEdges: Edge[] = backend.edges
    .filter((e) => activeNodeIds.has(e.from) && activeNodeIds.has(e.to))
    .map((e, i) => ({
      id: `edge-${e.from}-${e.to}-${i}`,
      source: e.from,
      target: e.to,
      type: "smoothstep",
      style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1.6 },
      animated: false,
    }));

  const allNodes = [profileNode, ...rfNodes];
  const allEdges = [...studentEdges, ...rfEdges];

  return layoutWithDagre(allNodes, allEdges);
}
