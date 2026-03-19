import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { StudyondSidebar } from "@/components/StudyondSidebar";
import { AIConciergeDrawer } from "@/components/AIConciergeDrawer";
import { GraphView } from "@/components/graph/GraphView";
import { NodeDetailDialog } from "@/components/graph/NodeDetailDialog";
import { mockBackendResponse } from "@/components/graph/mockGraphData";

const Index = () => {
  const [activePathId, setActivePathId] = useState("path-1");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogNodeData, setDialogNodeData] = useState<Record<string, unknown> | null>(null);

  const handleExpandNode = useCallback((nodeData: Record<string, unknown>) => {
    setDialogNodeData(nodeData);
    setDialogOpen(true);
  }, []);

  const handleNodeClick = useCallback((nodeId: string, nodeData: Record<string, unknown>) => {
    console.log("Node clicked:", nodeId, nodeData);
  }, []);

  const paths = mockBackendResponse.paths;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <StudyondSidebar />

      <main className="relative flex-1 flex flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1">
          {/* Compact overlay header + path tabs */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute left-6 top-5 z-10"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Topic Discovery
            </span>
            <h1 className="mt-1 font-serif text-2xl leading-tight tracking-editorial text-foreground lg:text-3xl">
              Your research <span className="italic text-foreground/70">pathways.</span>
            </h1>
            <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Explore matching supervisors and industry partners.
            </p>

            {/* Path toggle buttons */}
            <div className="pointer-events-auto mt-3 flex gap-2">
              {paths.map((path) => (
                <button
                  key={path.id}
                  onClick={() => setActivePathId(path.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                    activePathId === path.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {path.label}
                  <span className="ml-1.5 opacity-60">{Math.round(path.confidence * 100)}%</span>
                </button>
              ))}
            </div>
          </motion.div>

          <GraphView
            backendData={mockBackendResponse}
            activePathId={activePathId}
            onNodeClick={handleNodeClick}
            onExpandNode={handleExpandNode}
          />
        </div>
      </main>

      <AIConciergeDrawer />

      <NodeDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nodeData={dialogNodeData}
      />
    </div>
  );
};

export default Index;
