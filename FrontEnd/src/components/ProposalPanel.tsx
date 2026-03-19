// src/components/ProposalPanel.tsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Sparkles, FileText, Loader2, ChevronDown, ChevronUp,
  Send, Inbox, Check, Clock,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ProposalField {
  id: string;
  label: string;
  hint: string;
  value: string;
}

interface SelectedNodeSummary {
  id: string;
  label: string;
  type: string;
}

export interface SentProposal {
  id: string;
  target: string;
  targetType: string;
  sentAt: string;
  title: string;
  motivationPreview: string;
}

interface ProposalPanelProps {
  open: boolean;
  onClose: () => void;
  selectedNodes: SelectedNodeSummary[];
  onFieldChange: (fieldId: string, value: string) => void;
  fields: ProposalField[];
  isGenerating: boolean;
  // Only triggers AI chat message — never auto-fills the field
  onRequestAIHelp: (fieldId: string, currentValue: string) => void;
}

const FIELD_NUMS: Record<string, string> = {
  title: "01",
  motivation: "02",
  methods: "03",
  expected_results: "04",
};

function AutoResizeTextarea({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  hint: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div>
      <p className="mb-2 text-[11px] text-muted-foreground/60">{hint}</p>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full resize-none overflow-hidden rounded-xl border border-border/40 bg-card/80 px-4 py-3 text-sm text-card-foreground focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
        style={{ minHeight: "6rem" }}
      />
    </div>
  );
}

export function ProposalPanel({
  open,
  onClose,
  selectedNodes,
  onFieldChange,
  fields,
  isGenerating,
  onRequestAIHelp,
}: ProposalPanelProps) {
  const [expandedField, setExpandedField] = useState<string | null>("title");
  const [view, setView] = useState<"editor" | "sent">("editor");
  const [sentProposals, setSentProposals] = useState<SentProposal[]>([]);
  const [showSentConfirm, setShowSentConfirm] = useState(false);

  const handleSend = () => {
    const target =
      selectedNodes.length > 0
        ? selectedNodes[0].label
        : fields.find((f) => f.id === "title")?.value || "Unknown";
    const targetType = selectedNodes.length > 0 ? selectedNodes[0].type : "general";

    setSentProposals((prev) => [
      {
        id: Date.now().toString(),
        target,
        targetType,
        sentAt: new Date().toLocaleString("de-CH", { dateStyle: "medium", timeStyle: "short" }),
        title: fields.find((f) => f.id === "title")?.value || "Untitled",
        motivationPreview: fields.find((f) => f.id === "motivation")?.value || "",
      },
      ...prev,
    ]);
    setShowSentConfirm(true);
    setTimeout(() => setShowSentConfirm(false), 3000);
  };

  const filledCount = fields.filter((f) => f.value.trim()).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-30 flex flex-col rounded-t-3xl border border-border/40 bg-card shadow-2xl"
            style={{ maxHeight: "78vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-border/60 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-8 pb-4 pt-5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-semibold text-card-foreground">
                    Research Proposal
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedNodes.length > 0
                      ? selectedNodes.map((n) => n.label).join(", ")
                      : "General proposal — use AI chat for help"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isGenerating && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Thinking...
                  </div>
                )}
                <button
                  onClick={() => setView(view === "sent" ? "editor" : "sent")}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === "sent"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  <Inbox className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Sent
                  {sentProposals.length > 0 && (
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      view === "sent" ? "bg-white/20" : "bg-primary/15 text-primary"
                    }`}>
                      {sentProposals.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Node chips */}
            {selectedNodes.length > 0 && view === "editor" && (
              <div className="flex gap-2 overflow-x-auto px-8 pb-3 shrink-0 scrollbar-none">
                {selectedNodes.map((node) => (
                  <div
                    key={node.id}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 dark:border-green-800 dark:bg-green-950"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span className="text-[11px] font-medium text-green-700 dark:text-green-400">
                      {node.label}
                    </span>
                    <span className="text-[10px] text-green-600/60 dark:text-green-500/60">
                      {node.type}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="h-px bg-border/30 mx-8 shrink-0" />

            {/* ── EDITOR VIEW ── */}
            {view === "editor" && (
              <>
                <ScrollArea className="flex-1 min-h-0 px-8 py-4">
                  <div className="space-y-2 pb-4">
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className="rounded-2xl border border-border/40 bg-background/60 overflow-hidden"
                      >
                        {/* Field header */}
                        <button
                          className="flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-secondary/30 transition-colors"
                          onClick={() =>
                            setExpandedField(expandedField === field.id ? null : field.id)
                          }
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] font-bold text-muted-foreground/40">
                              {FIELD_NUMS[field.id]}
                            </span>
                            <span className="text-sm font-medium text-card-foreground">
                              {field.label}
                            </span>
                            {field.value.trim() && (
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* AI tip — ONLY sends a chat message, never fills the field */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRequestAIHelp(field.id, field.value);
                              }}
                              className="flex items-center gap-1 rounded-full bg-primary/8 px-2.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/15 transition-colors"
                            >
                              <Sparkles className="h-3 w-3" strokeWidth={1.5} />
                              AI tip
                            </button>
                            {expandedField === field.id ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {/* Expandable textarea */}
                        <AnimatePresence initial={false}>
                          {expandedField === field.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="border-t border-border/30 px-5 pb-4 pt-3">
                                <AutoResizeTextarea
                                  value={field.value}
                                  onChange={(v) => onFieldChange(field.id, v)}
                                  hint={field.hint}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Footer */}
                <div className="border-t border-border/30 px-8 py-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                        <span>{filledCount}/{fields.length} sections filled</span>
                        <span className="text-muted-foreground/40">Click ✦ AI tip for suggestions</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${(filledCount / fields.length) * 100}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSend}
                      className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
                    >
                      <Send className="h-4 w-4" strokeWidth={2} />
                      Send proposal
                    </button>
                  </div>

                  <AnimatePresence>
                    {showSentConfirm && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 dark:bg-green-950/40"
                      >
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={2} />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          Proposal sent successfully!
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}

            {/* ── SENT VIEW ── */}
            {view === "sent" && (
              <ScrollArea className="flex-1 min-h-0 px-8 py-6">
                {sentProposals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Inbox className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1} />
                    <p className="font-serif text-base text-muted-foreground/50">No proposals sent yet</p>
                    <p className="mt-1 text-xs text-muted-foreground/40">
                      Fill in the editor and click "Send proposal"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-6">
                    {sentProposals.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-2xl border border-border/40 bg-background/60 px-6 py-5"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-serif text-base font-semibold text-card-foreground truncate">
                              {p.title || "Untitled proposal"}
                            </h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">To: {p.target}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-4">
                            <Clock className="h-3 w-3 text-muted-foreground/50" strokeWidth={1.5} />
                            <span className="text-[11px] text-muted-foreground/60">{p.sentAt}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                            <Check className="h-3 w-3" strokeWidth={2} />
                            Sent
                          </span>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground capitalize">
                            {p.targetType}
                          </span>
                        </div>
                        {p.motivationPreview && (
                          <p className="text-xs leading-relaxed text-muted-foreground/70 line-clamp-2">
                            {p.motivationPreview}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── 4 fields only ─────────────────────────────

export function buildDefaultFields(): ProposalField[] {
  return [
    {
      id: "title",
      label: "Research Title",
      hint: "A clear, specific title that captures your research direction.",
      value: "",
    },
    {
      id: "motivation",
      label: "Motivation & Research Gap",
      hint: "Why is this research important? What problem does it solve? (3–5 sentences)",
      value: "",
    },
    {
      id: "methods",
      label: "Methods & Approach",
      hint: "Describe your technical approach, tools, frameworks, and datasets.",
      value: "",
    },
    {
      id: "expected_results",
      label: "Expected Results",
      hint: "What will you deliver? What impact do you expect?",
      value: "",
    },
  ];
}
