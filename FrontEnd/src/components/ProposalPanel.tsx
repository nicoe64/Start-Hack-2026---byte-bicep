// src/components/ProposalPanel.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, FileText, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ProposalField {
  id: string;
  label: string;
  placeholder: string;
  hint: string;
  value: string;
  rows: number;
}

interface SelectedNodeSummary {
  id: string;
  label: string;
  type: string;
  reasoning?: string;
  subtitle?: string;
}

interface ProposalPanelProps {
  open: boolean;
  onClose: () => void;
  selectedNodes: SelectedNodeSummary[];
  onFieldChange: (fieldId: string, value: string) => void;
  fields: ProposalField[];
  isGenerating: boolean;
  onRequestAIHelp: (fieldId: string, currentValue: string) => void;
}

const FIELD_ICONS: Record<string, string> = {
  title: "01",
  institution: "02",
  motivation: "03",
  methods: "04",
  timeline: "05",
  expected_results: "06",
};

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

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-30 flex flex-col rounded-t-3xl border border-border/40 bg-card shadow-2xl"
            style={{ maxHeight: "78vh" }}
          >
            {/* Handle */}
            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-border/60" />

            {/* Header */}
            <div className="flex items-center justify-between px-8 pb-4 pt-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-semibold text-card-foreground">
                    Research Proposal
                  </h2>
                  {selectedNodes.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Based on {selectedNodes.map((n) => n.label).join(", ")}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      General proposal — no nodes selected
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isGenerating && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    AI filling in...
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Context chips — selected nodes */}
            {selectedNodes.length > 0 && (
              <div className="flex gap-2 overflow-x-auto px-8 pb-4 scrollbar-none">
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

            <div className="h-px bg-border/30 mx-8" />

            {/* Fields */}
            <ScrollArea className="flex-1 px-8 py-4">
              <div className="space-y-2 pb-6">
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
                        <span className="font-mono text-[10px] font-bold text-muted-foreground/50">
                          {FIELD_ICONS[field.id]}
                        </span>
                        <span className="text-sm font-medium text-card-foreground">
                          {field.label}
                        </span>
                        {field.value && (
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestAIHelp(field.id, field.value);
                          }}
                          className="flex items-center gap-1 rounded-full bg-primary/8 px-2.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/15 transition-colors"
                          title="Ask AI for help with this field"
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

                    {/* Field content */}
                    <AnimatePresence initial={false}>
                      {expandedField === field.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="border-t border-border/30 px-5 pb-4 pt-3">
                            <p className="mb-2 text-[11px] text-muted-foreground/70">
                              {field.hint}
                            </p>
                            <textarea
                              value={field.value}
                              onChange={(e) => onFieldChange(field.id, e.target.value)}
                              placeholder={field.placeholder}
                              rows={field.rows}
                              className="w-full resize-none rounded-xl border border-border/40 bg-card/80 px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer hint */}
            <div className="border-t border-border/30 px-8 py-4">
              <p className="text-center text-[11px] text-muted-foreground/60">
                Use the AI chat on the right to get help with any field — just describe what you need
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Default field definitions ──────────────────

export function buildDefaultFields(): ProposalField[] {
  return [
    {
      id: "title",
      label: "Research Title",
      placeholder: "e.g. Reinforcement Learning for Autonomous Navigation in Industrial Environments",
      hint: "A clear, specific title that captures your research direction.",
      value: "",
      rows: 2,
    },
    {
      id: "institution",
      label: "Target Institution / Supervisor",
      placeholder: "e.g. Prof. Dr. Müller at THI, or Airbus Defence & Space",
      hint: "Who are you addressing this proposal to?",
      value: "",
      rows: 1,
    },
    {
      id: "motivation",
      label: "Motivation & Research Gap",
      placeholder: "Why is this research important? What problem does it solve?",
      hint: "Explain the academic or industrial gap your research fills. 3–5 sentences.",
      value: "",
      rows: 4,
    },
    {
      id: "methods",
      label: "Methods & Approach",
      placeholder: "e.g. I will use deep reinforcement learning with sim-to-real transfer...",
      hint: "Describe your technical approach, tools, frameworks, and datasets you plan to use.",
      value: "",
      rows: 4,
    },
    {
      id: "timeline",
      label: "Timeline",
      placeholder: "e.g. Months 1–2: Literature review. Months 3–4: Implementation...",
      hint: "A rough breakdown of your thesis timeline in phases.",
      value: "",
      rows: 3,
    },
    {
      id: "expected_results",
      label: "Expected Results",
      placeholder: "e.g. A trained model that outperforms baselines by X%, a published paper...",
      hint: "What will you deliver? What impact do you expect?",
      value: "",
      rows: 3,
    },
  ];
}
