import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type NodeMouseHandler,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { ProfileNode } from "./ProfileNode";
import { EntityNode } from "./EntityNode";
import { parseGraphToFlow } from "./parseGraphToFlow";
import type { BackendGraphResponse } from "./mockGraphData";

const nodeTypes = {
  profile: ProfileNode,
  entity: EntityNode,
};

interface GraphViewProps {
  backendData: BackendGraphResponse;
  activePathId: string;
  onNodeClick?: (nodeId: string, nodeData: Record<string, unknown>) => void;
  onExpandNode?: (nodeData: Record<string, unknown>) => void;
}

export function GraphView({ backendData, activePathId, onNodeClick, onExpandNode }: GraphViewProps) {
  const { layoutedNodes, layoutedEdges } = useMemo(() => {
    const { nodes, edges } = parseGraphToFlow(backendData, activePathId);
    // Inject onExpand callback into each node's data
    const nodesWithExpand = nodes.map((node) => ({
      ...node,
      data: { ...node.data, onExpand: onExpandNode },
    }));
    return { layoutedNodes: nodesWithExpand, layoutedEdges: edges };
  }, [backendData, activePathId, onExpandNode]);

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges);

  // Re-sync when path changes (useNodesState only uses initial value)
  useMemo(() => {
    // This is handled by key prop on ReactFlow parent
  }, [layoutedNodes, layoutedEdges]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onNodeClick?.(node.id, node.data as Record<string, unknown>);
    },
    [onNodeClick]
  );

  return (
    <div className="h-full w-full rounded-2xl border border-border/30 bg-card/40 shadow-editorial">
      <ReactFlow
        key={activePathId}
        nodes={layoutedNodes}
        edges={layoutedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        className="!bg-transparent"
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background gap={40} size={1} color="hsl(var(--border))" />
      </ReactFlow>
    </div>
  );
}
