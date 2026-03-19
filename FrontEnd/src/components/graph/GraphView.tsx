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
  selectedNodeIds: Set<string>;
  onNodeClick?: (nodeId: string, nodeData: Record<string, unknown>) => void;
  onExpandNode?: (nodeData: Record<string, unknown>) => void;
}

export function GraphView({
  backendData,
  activePathId,
  selectedNodeIds,
  onNodeClick,
  onExpandNode,
}: GraphViewProps) {
  const { layoutedNodes, layoutedEdges } = useMemo(() => {
    const { nodes, edges } = parseGraphToFlow(backendData, activePathId);
    const nodesWithMeta = nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onExpand: onExpandNode,
        isSelected: selectedNodeIds.has(node.id),
      },
    }));
    return { layoutedNodes: nodesWithMeta, layoutedEdges: edges };
  }, [backendData, activePathId, onExpandNode, selectedNodeIds]);

  const [, , onNodesChange] = useNodesState(layoutedNodes);
  const [, , onEdgesChange] = useEdgesState(layoutedEdges);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onNodeClick?.(node.id, node.data as Record<string, unknown>);
    },
    [onNodeClick]
  );

  // Key includes selection size so React re-renders when selection changes
  const graphKey = `${activePathId}-${selectedNodeIds.size}-${Array.from(selectedNodeIds).join(",")}`;

  return (
    <div className="h-full w-full rounded-2xl border border-border/30 bg-card/40 shadow-editorial">
      <ReactFlow
        key={graphKey}
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
