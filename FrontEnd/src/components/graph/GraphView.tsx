// src/components/graph/GraphView.tsx
import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
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
  selectedNodeId: string | null;
  onNodeClick?: (nodeId: string, nodeData: Record<string, unknown>) => void;
  onExpandNode?: (nodeData: Record<string, unknown>) => void;
}

export function GraphView({
  backendData,
  activePathId,
  selectedNodeId,
  onNodeClick,
  onExpandNode,
}: GraphViewProps) {
  const layoutedNodes = useMemo(() => {
    const { nodes } = parseGraphToFlow(backendData, activePathId);
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onExpand: onExpandNode,
        isSelected: node.id === selectedNodeId,
      },
    }));
  }, [backendData, activePathId, onExpandNode, selectedNodeId]);

  const layoutedEdges = useMemo(() => {
    const { edges } = parseGraphToFlow(backendData, activePathId);
    return edges;
  }, [backendData, activePathId]);

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onNodeClick?.(node.id, node.data as Record<string, unknown>);
    },
    [onNodeClick]
  );

  return (
    <div className="h-full w-full rounded-2xl border border-border/30 bg-card/40 shadow-editorial">
      <ReactFlow
        key={`${activePathId}-${selectedNodeId}`}
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
