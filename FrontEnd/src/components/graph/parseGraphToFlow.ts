import type { Node, Edge } from "@xyflow/react";
import dagre from "dagre";
import type { BackendGraphResponse } from "./mockGraphData";

const NODE_WIDTH = 280;
const NODE_HEIGHT = 120;

function layoutWithDagre(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 100 });

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

const EDGE_STYLES: Record<string, React.CSSProperties> = {
  belongs_to: {
    stroke: "hsl(var(--muted-foreground))",
    strokeWidth: 1.6,
  },
  posted_by: {
    stroke: "hsl(var(--muted-foreground))",
    strokeWidth: 1.6,
  },
  supervised_by: {
    stroke: "hsl(142, 71%, 35%)",
    strokeWidth: 2,
    strokeDasharray: "6 4",
  },
  has_expert: {
    stroke: "hsl(var(--muted-foreground))",
    strokeWidth: 1.2,
  },
};

/** Map backend node type to our custom React Flow node type */
function mapNodeType(backendType: string): string {
  if (backendType === "topic") return "entity";
  return "entity";
}

/** Map backend node type to entityType for EntityNode rendering */
function mapEntityType(backendType: string): string {
  return backendType; // topic | company | supervisor | expert
}

export function parseGraphToFlow(
  backend: BackendGraphResponse,
  activePathId: string,
): { nodes: Node[]; edges: Edge[] } {
  const path = backend.paths.find((p) => p.id === activePathId);
  if (!path) return { nodes: [], edges: [] };

  const activeNodeIds = new Set(path.node_ids);

  // Build student profile node from student_summary
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

  // Filter and map backend nodes
  const filteredBackendNodes = backend.nodes.filter((n) => activeNodeIds.has(n.id));

  const rfNodes: Node[] = filteredBackendNodes.map((n) => ({
    id: n.id,
    type: mapNodeType(n.type),
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

  // Find the topic node(s) — these connect to the student profile
  const topicNodeIds = filteredBackendNodes.filter((n) => n.type === "topic").map((n) => n.id);

  // Edges from student to topic nodes
  const studentEdges: Edge[] = topicNodeIds.map((tid, i) => ({
    id: `student-to-${tid}-${i}`,
    source: "__student__",
    target: tid,
    type: "default",
    style: {
      stroke: "#15803d",
      strokeWidth: 2,
    },
    animated: false,
  }));

  // Filter and map backend edges
  const rfEdges: Edge[] = backend.edges
    .filter((e) => activeNodeIds.has(e.from) && activeNodeIds.has(e.to))
    .map((e, i) => ({
      id: `edge-${e.from}-${e.to}-${i}`,
      source: e.from,
      target: e.to,
      type: "default",
      style: {
        stroke: "#15803d",
        strokeWidth: 1.6,
      },
      animated: false,
    }));

  const allNodes = [profileNode, ...rfNodes];
  const allEdges = [...studentEdges, ...rfEdges];

  return layoutWithDagre(allNodes, allEdges);
}
