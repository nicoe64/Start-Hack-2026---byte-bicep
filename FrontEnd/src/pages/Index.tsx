// src/pages/Index.tsx
import { useCallback, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText } from "lucide-react";
import { StudyondSidebar } from "@/components/StudyondSidebar";
import { AIConciergeDrawer } from "@/components/AIConciergeDrawer";
import { GraphView } from "@/components/graph/GraphView";
import { NodeDetailDialog } from "@/components/graph/NodeDetailDialog";
import { ProposalPanel, buildDefaultFields, type ProposalField } from "@/components/ProposalPanel";
import type { BackendGraphResponse } from "@/components/graph/mockGraphData";
import { sendMessage, type ChatResponse } from "@/lib/api";

const SESSION_ID = "demo-session";

export interface SelectedNodeSummary {
  id: string;
  label: string;
  type: string;
  reasoning?: string;
  subtitle?: string;
  entityId?: string;
  data?: Record<string, unknown>;
}

export type ChatMode = "advisor" | "proposal";

interface IndexProps {
  sharedGraphData: BackendGraphResponse | null;
  onGraphDataChange: (data: BackendGraphResponse | null) => void;
  onEnrichedProfileChange: (profile: Record<string, unknown>) => void;
}

const Index = ({ sharedGraphData, onGraphDataChange, onEnrichedProfileChange }: IndexProps) => {
  const [activePathId, setActivePathId] = useState("path-1");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogNodeData, setDialogNodeData] = useState<Record<string, unknown> | null>(null);

  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedNodeSummaries, setSelectedNodeSummaries] = useState<SelectedNodeSummary[]>([]);

  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalFields, setProposalFields] = useState<ProposalField[]>(buildDefaultFields());
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);

  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatMode, setChatMode] = useState<ChatMode>("advisor");
  const [graphData, setGraphData] = useState<BackendGraphResponse | null>(sharedGraphData);
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions] = useState(3);
  const [isLoading, setIsLoading] = useState(false);

  const proposalFieldsRef = useRef(proposalFields);
  useEffect(() => { proposalFieldsRef.current = proposalFields; }, [proposalFields]);

  // Welcome
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

  // Sync graphData up to App
  const updateGraphData = useCallback((data: BackendGraphResponse | null) => {
    setGraphData(data);
    onGraphDataChange(data);
  }, [onGraphDataChange]);

  // Node click → toggle green
  const handleNodeClick = useCallback((nodeId: string, nodeData: Record<string, unknown>) => {
    setSelectedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) { next.delete(nodeId); } else { next.add(nodeId); }
      return next;
    });
    setSelectedNodeSummaries((prev) => {
      const exists = prev.find((n) => n.id === nodeId);
      if (exists) return prev.filter((n) => n.id !== nodeId);
      return [...prev, {
        id: nodeId,
        label: (nodeData.name as string) ?? nodeId,
        type: (nodeData.entityType as string) ?? "unknown",
        reasoning: nodeData.reasoning as string | undefined,
        subtitle: nodeData.role as string | undefined,
        entityId: nodeData.entityId as string | undefined,
        data: nodeData,
      }];
    });
  }, []);

  // Info button → detail dialog
  const handleExpandNode = useCallback((nodeData: Record<string, unknown>) => {
    setDialogNodeData(nodeData);
    setDialogOpen(true);
  }, []);

  // Open proposal
  const openProposal = useCallback(async (withNodes: boolean) => {
    setProposalOpen(true);
    setChatMode("proposal");

    if (withNodes && selectedNodeSummaries.length > 0) {
      setIsGeneratingProposal(true);
      const nodeContext = selectedNodeSummaries
        .map((n) => `[${n.type.toUpperCase()}] ${n.label}: ${n.reasoning ?? ""}`)
        .join("\n");
      try {
        const res = await sendMessage(
          SESSION_ID,
          `I want to write a research proposal. Here are the entities I'm interested in:\n${nodeContext}\n\nGive me a suggested TITLE:, a TARGET INSTITUTION: line, and a MOTIVATION: paragraph I can start from.`,
          Array.from(selectedNodeIds)
        );
        const text = res.response;
        const extract = (label: string) => {
          const match = text.match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n[A-Z ]+:|$)`, "i"));
          return match ? match[1].trim() : "";
        };
        setProposalFields((prev) => prev.map((f) => {
          if (f.id === "title") return { ...f, value: extract("TITLE") || f.value };
          if (f.id === "institution") return { ...f, value: extract("INSTITUTION") || extract("TARGET INSTITUTION") || f.value };
          if (f.id === "motivation") return { ...f, value: extract("MOTIVATION") || f.value };
          return f;
        }));
        setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
      } catch { /* silent */ }
      finally { setIsGeneratingProposal(false); }
    } else {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "I'm now in Proposal Assistant mode. Tell me which field you need help with — for example: \"Give me a motivation paragraph for a thesis on computer vision at a manufacturing company.\" Or click the ✦ AI tip button next to any field.",
      }]);
    }
  }, [selectedNodeIds, selectedNodeSummaries]);

  const closeProposal = useCallback(() => {
    setProposalOpen(false);
    setChatMode("advisor");
  }, []);

  const handleAIFieldHelp = useCallback(async (fieldId: string, currentValue: string) => {
    const field = proposalFields.find((f) => f.id === fieldId);
    if (!field) return;
    const nodeCtx = selectedNodeSummaries.length > 0
      ? `Relevant entities: ${selectedNodeSummaries.map((n) => `${n.label} (${n.type})`).join(", ")}`
      : "";
    const prompt = `Help me write the "${field.label}" section of my research proposal. ${nodeCtx} ${currentValue ? `My current draft: "${currentValue}"` : "I haven't written anything yet."} Give me a concrete example or suggestion I can adapt.`;
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setIsLoading(true);
    try {
      const res = await sendMessage(SESSION_ID, prompt, Array.from(selectedNodeIds));
      setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Couldn't get AI help right now." }]);
    } finally { setIsLoading(false); }
  }, [proposalFields, selectedNodeIds, selectedNodeSummaries]);

  const handleSendMessage = useCallback(async (text: string, nodeIds: string[] = []) => {
    if (!text.trim() || isLoading) return;
    const ids = nodeIds.length > 0 ? nodeIds : Array.from(selectedNodeIds);

    let fullText = text;
    if (chatMode === "proposal") {
      const filled = proposalFieldsRef.current.filter((f) => f.value.trim());
      if (filled.length > 0) {
        const context = filled.map((f) => `${f.label}: ${f.value.slice(0, 120)}${f.value.length > 120 ? "..." : ""}`).join("\n");
        fullText = `[Proposal draft context:\n${context}]\n\n${text}`;
      }
    }

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsLoading(true);

    try {
      const res: ChatResponse = await sendMessage(SESSION_ID, fullText, ids);
      setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
      setQuestionCount(res.question_count);

      // Sync enriched profile up
      if (res.enriched_profile && Object.keys(res.enriched_profile).length > 0) {
        onEnrichedProfileChange(res.enriched_profile);
      }

      if (res.graph && res.graph.paths && res.graph.paths.length > 0) {
        updateGraphData(res.graph);
        setActivePathId(res.graph.paths[0].id);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally { setIsLoading(false); }
  }, [isLoading, selectedNodeIds, chatMode, updateGraphData, onEnrichedProfileChange]);

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setProposalFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, value } : f)));
  }, []);

  const paths = graphData?.paths ?? [];
  const hasSelection = selectedNodeIds.size > 0;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <StudyondSidebar />

      <main className="relative flex-1 flex flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1">

          {/* Header */}
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

          {/* Write proposal button */}
          {graphData && !proposalOpen && (
            <div className="pointer-events-auto absolute right-6 top-5 z-10">
              <button
                onClick={() => openProposal(false)}
                className="flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-3.5 py-2 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm hover:border-border hover:text-foreground transition-all"
              >
                <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
                Write proposal
              </button>
            </div>
          )}

          {/* Graph or empty */}
          {graphData ? (
            <GraphView
              backendData={graphData}
              activePathId={activePathId}
              selectedNodeIds={selectedNodeIds}
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

          {/* Selection bar */}
          <AnimatePresence>
            {hasSelection && !proposalOpen && (
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2"
              >
                <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/95 px-5 py-3 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                      {selectedNodeIds.size}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {selectedNodeIds.size === 1 ? "node" : "nodes"} selected
                    </span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <button
                    onClick={() => openProposal(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
                  >
                    <FileText className="h-3.5 w-3.5" strokeWidth={2} />
                    Create research proposal
                  </button>
                  <button
                    onClick={() => { setSelectedNodeIds(new Set()); setSelectedNodeSummaries([]); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Proposal panel */}
          <ProposalPanel
            open={proposalOpen}
            onClose={closeProposal}
            selectedNodes={selectedNodeSummaries}
            onFieldChange={handleFieldChange}
            fields={proposalFields}
            isGenerating={isGeneratingProposal}
            onRequestAIHelp={handleAIFieldHelp}
          />
        </div>
      </main>

      <AIConciergeDrawer
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        questionCount={questionCount}
        maxQuestions={maxQuestions}
        chatMode={chatMode}
        selectedNodes={selectedNodeSummaries}
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
