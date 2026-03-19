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

const Index = () => {
  const [activePathId, setActivePathId] = useState("path-1");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogNodeData, setDialogNodeData] = useState<Record<string, unknown> | null>(null);

  // Chat state
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [graphData, setGraphData] = useState<BackendGraphResponse | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [intent, setIntent] = useState("");

  // Welcome message on mount
  useEffect(() => {
    const fetchWelcome = async () => {
      try {
        setIsLoading(true);
        const res = await sendMessage(SESSION_ID, "");
        setMessages([{ role: "assistant", content: res.response }]);
        setIntent(res.intent);
      } catch (e) {
        console.error("Welcome failed:", e);
        setMessages([{ role: "assistant", content: "Welcome! Tell me about your thesis interests." }]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWelcome();
  }, []);

  // Send a chat message
  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsLoading(true);

    try {
      const res: ChatResponse = await sendMessage(SESSION_ID, text);

      setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
      setQuestionCount(res.question_count);
      setIntent(res.intent);

      // If backend returns a graph, show it
      if (res.graph && res.graph.paths && res.graph.paths.length > 0) {
        setGraphData(res.graph);
        setActivePathId(res.graph.paths[0].id);
      }
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleExpandNode = useCallback((nodeData: Record<string, unknown>) => {
    setDialogNodeData(nodeData);
    setDialogOpen(true);
  }, []);

  const handleNodeClick = useCallback((nodeId: string, nodeData: Record<string, unknown>) => {
    console.log("Node clicked:", nodeId, nodeData);
  }, []);

  const paths = graphData?.paths ?? [];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <StudyondSidebar />

      <main className="relative flex-1 flex flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1">
          {/* Header + path tabs */}
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
            {paths.length > 0 && (
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
            )}

            {/* Progress bar when chatting */}
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

          {/* Graph or empty state */}
          {graphData ? (
            <GraphView
              backendData={graphData}
              activePathId={activePathId}
              onNodeClick={handleNodeClick}
              onExpandNode={handleExpandNode}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="font-serif text-xl text-muted-foreground/50">
                  {isLoading ? "Thinking..." : "Chat with the AI advisor to discover your paths."}
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
      />

      <NodeDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nodeData={dialogNodeData}
      />
    </div>
  );
};

export default Index;
