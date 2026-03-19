// src/pages/Index.tsx
import { useCallback, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { StudyondSidebar } from "@/components/StudyondSidebar";
import { AIConciergeDrawer } from "@/components/AIConciergeDrawer";
import { GraphView } from "@/components/graph/GraphView";
import { NodeDetailDialog } from "@/components/graph/NodeDetailDialog";
import type { BackendGraphResponse } from "@/components/graph/mockGraphData";
import { sendMessage, type ChatResponse } from "@/lib/api";

const SESSION_ID = "demo-session";

export interface SelectedNode {
  id: string;
  label: string;
  type: string;
  data: Record<string, unknown>;
}

const Index = () => {
  const [activePathId, setActivePathId] = useState("path-1");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogNodeData, setDialogNodeData] = useState<Record<string, unknown> | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [graphData, setGraphData] = useState<BackendGraphResponse | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions] = useState(3);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchWelcome = async () => {
      try {
        setIsLoading(true);
        const res = await sendMessage(SESSION_ID, "");
        setMessages([{ role: "assistant", content: res.response }]);
      } catch {
        setMessages([{ role: "assistant", content: "Welcome! Tell me about your thesis interests." }]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWelcome();
  }, []);

  const handleSendMessage = useCallback(
    async (text: string, nodeIds: string[] = []) => {
      if (!text.trim() || isLoading) return;

      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setIsLoading(true);

      try {
        const res: ChatResponse = await sendMessage(SESSION_ID, text, nodeIds);

        setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
        setQuestionCount(res.question_count);

        if (res.graph && res.graph.paths && res.graph.paths.length > 0) {
          setGraphData(res.graph);
          setActivePathId(res.graph.paths[0].id);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Something went wrong. Please try again." },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  // Node click → open dialog immediately (this was the bug: handleNodeClick only logged)
  const handleNodeClick = useCallback(
    (nodeId: string, nodeData: Record<string, unknown>) => {
      // Toggle selection
      setSelectedNode((prev) =>
        prev?.id === nodeId
          ? null
          : {
              id: nodeId,
              label: (nodeData.name as string) ?? nodeId,
              type: (nodeData.entityType as string) ?? "unknown",
              data: nodeData,
            }
      );
      // Open detail dialog
      setDialogNodeData(nodeData);
      setDialogOpen(true);
    },
    []
  );

  // Expand button inside node → also opens dialog
  const handleExpandNode = useCallback((nodeData: Record<string, unknown>) => {
    setDialogNodeData(nodeData);
    setDialogOpen(true);
  }, []);

  // "Ask AI about this" from dialog → sends contextual message
  const handleAskAboutNode = useCallback(
    (nodeData: Record<string, unknown>) => {
      const label = (nodeData.name as string) ?? "this";
      const type = (nodeData.entityType as string) ?? "entity";
      const nodeId = (nodeData.entityId as string) ?? "";
      setDialogOpen(false);
      handleSendMessage(`Tell me more about ${label} and why it's a good fit for my thesis.`, [nodeId]);
    },
    [handleSendMessage]
  );

  // "Send proposal" from dialog → sends proposal message
  const handlePropose = useCallback(
    (nodeData: Record<string, unknown>) => {
      const label = (nodeData.name as string) ?? "this";
      const nodeId = (nodeData.entityId as string) ?? "";
      setDialogOpen(false);
      handleSendMessage(
        `I'd like to send a research proposal to ${label}. Help me draft it based on my profile.`,
        [nodeId]
      );
    },
    [handleSendMessage]
  );

  const paths = graphData?.paths ?? [];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <StudyondSidebar />

      <main className="relative flex-1 flex flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1">
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

            {paths.length > 0 && (
              <div className="pointer-events-auto mt-3 flex gap-2 flex-wrap">
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
            )}

            {!graphData && questionCount > 0 && (
              <div className="pointer-events-auto mt-4 w-64">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Gathering info...</span>
                  <span>{questionCount}/{maxQuestions}</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${(questionCount / maxQuestions) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>

          {graphData ? (
            <GraphView
              backendData={graphData}
              activePathId={activePathId}
              selectedNodeId={selectedNode?.id ?? null}
              onNodeClick={handleNodeClick}
              onExpandNode={handleExpandNode}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="font-serif text-xl text-muted-foreground/50">
                  {isLoading
                    ? "Thinking..."
                    : "Chat with the AI advisor to discover your paths."}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <AIConciergeDrawer
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        questionCount={questionCount}
        maxQuestions={maxQuestions}
        selectedNode={selectedNode}
        onClearSelectedNode={() => setSelectedNode(null)}
      />

      <NodeDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nodeData={dialogNodeData}
        onAskAI={handleAskAboutNode}
        onPropose={handlePropose}
      />
    </div>
  );
};

export default Index;
