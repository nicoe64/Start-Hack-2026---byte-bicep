// src/components/AIConciergeDrawer.tsx
import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Sparkles, Loader2, FileText } from "lucide-react";
import type { SelectedNodeSummary, ChatMode } from "@/pages/Index";

interface Message {
  role: string;
  content: string;
}

interface AIConciergeDrawerProps {
  messages: Message[];
  input: string;
  onInputChange: (v: string) => void;
  onSendMessage: (text: string, nodeIds?: string[]) => void;
  isLoading: boolean;
  questionCount: number;
  maxQuestions: number;
  chatMode: ChatMode;
  selectedNodes: SelectedNodeSummary[];
}

// ── Simple Markdown → React renderer ──────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines (add spacing via margin on previous element)
    if (line.trim() === "") {
      i++;
      continue;
    }

    // H1 / H2 / H3
    if (line.startsWith("### ")) {
      result.push(
        <p key={i} className="font-semibold text-sm mt-3 mb-0.5 text-card-foreground">
          {inlineFormat(line.slice(4))}
        </p>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ") || line.startsWith("# ")) {
      const content = line.startsWith("## ") ? line.slice(3) : line.slice(2);
      result.push(
        <p key={i} className="font-semibold text-sm mt-3 mb-0.5 text-card-foreground">
          {inlineFormat(content)}
        </p>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---" || line.trim() === "***") {
      result.push(<hr key={i} className="my-2 border-border/30" />);
      i++;
      continue;
    }

    // Bullet list
    if (line.match(/^[-*+] /)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*+] /)) {
        items.push(
          <li key={i} className="ml-3 leading-relaxed">
            {inlineFormat(lines[i].slice(2))}
          </li>
        );
        i++;
      }
      result.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1 text-sm">
          {items}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        const content = lines[i].replace(/^\d+\. /, "");
        items.push(
          <li key={i} className="ml-3 leading-relaxed">
            {inlineFormat(content)}
          </li>
        );
        i++;
      }
      result.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 my-1 text-sm">
          {items}
        </ol>
      );
      continue;
    }

    // Bold line that acts as a label (ends with :)
    if (line.match(/^\*\*.*\*\*:?$/)) {
      result.push(
        <p key={i} className="font-semibold text-sm mt-2 mb-0.5 text-card-foreground">
          {inlineFormat(line)}
        </p>
      );
      i++;
      continue;
    }

    // Normal paragraph
    result.push(
      <p key={i} className="text-sm leading-relaxed mt-1">
        {inlineFormat(line)}
      </p>
    );
    i++;
  }

  return result;
}

// Inline: **bold**, *italic*, `code`
function inlineFormat(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Split on **bold**, *italic*, `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let match;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<span key={idx++}>{text.slice(last, match.index)}</span>);
    }
    const raw = match[0];
    if (raw.startsWith("**")) {
      parts.push(<strong key={idx++} className="font-semibold">{raw.slice(2, -2)}</strong>);
    } else if (raw.startsWith("*")) {
      parts.push(<em key={idx++}>{raw.slice(1, -1)}</em>);
    } else if (raw.startsWith("`")) {
      parts.push(
        <code key={idx++} className="rounded bg-secondary px-1 py-0.5 text-[11px] font-mono">
          {raw.slice(1, -1)}
        </code>
      );
    }
    last = match.index + raw.length;
  }
  if (last < text.length) {
    parts.push(<span key={idx++}>{text.slice(last)}</span>);
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ── Component ─────────────────────────────────

export function AIConciergeDrawer({
  messages,
  input,
  onInputChange,
  onSendMessage,
  isLoading,
  questionCount,
  maxQuestions,
  chatMode,
  selectedNodes,
}: AIConciergeDrawerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    const nodeIds = selectedNodes.map((n) => n.id);
    onSendMessage(input.trim(), nodeIds);
    onInputChange("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isProposalMode = chatMode === "proposal";

  const placeholder = isProposalMode
    ? selectedNodes.length > 0
      ? `Ask about ${selectedNodes[0].label}...`
      : "Ask for help with any proposal section..."
    : "Tell me about your thesis interests...";

  return (
    <aside className="relative flex h-full w-[380px] flex-col overflow-hidden border-l border-border/30">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="ai-glow-bg animate-pulse-glow absolute inset-0" />
        <div className="absolute inset-0 bg-background/60 backdrop-blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 px-6 py-5 shrink-0">
        <div className="flex items-center gap-2.5">
          {isProposalMode
            ? <FileText className="h-4 w-4 text-primary" strokeWidth={1.5} />
            : <Sparkles className="h-4 w-4 text-primary" />
          }
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/70">
            {isProposalMode ? "Proposal Assistant" : "AI Thesis Advisor"}
          </span>
        </div>
        {!isProposalMode && questionCount > 0 && questionCount < maxQuestions && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
            {questionCount}/{maxQuestions}
          </span>
        )}
        {isProposalMode && selectedNodes.length > 0 && (
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
            {selectedNodes.length} node{selectedNodes.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Proposal mode banner */}
      <AnimatePresence>
        {isProposalMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden shrink-0"
          >
            <div className="border-b border-border/20 bg-primary/5 px-6 py-3">
              <p className="text-[11px] text-primary/80 leading-relaxed">
                {selectedNodes.length > 0
                  ? `Writing proposal for: ${selectedNodes.map((n) => n.label).join(", ")}. Ask me to help with any field.`
                  : "Ask me to help with any section — motivation, methods, or expected results."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="mb-10 text-center">
            <p className="font-serif text-lg text-muted-foreground/70">
              Let's find the best topic for you.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={
                  msg.role === "user"
                    ? "ml-8 rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground"
                    : "mr-4 rounded-2xl rounded-bl-md bg-card/80 px-4 py-3 text-card-foreground shadow-sm"
                }
              >
                {msg.role === "assistant"
                  ? <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
                  : <p className="text-sm leading-relaxed">{msg.content}</p>
                }
              </motion.div>
            ))}
            {isLoading && (
              <div className="mr-4 flex items-center gap-2 rounded-2xl bg-card/80 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {isProposalMode ? "Drafting..." : "Thinking..."}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/30 px-6 py-4 shrink-0">
        <div className={`flex items-end gap-2 rounded-2xl border bg-card/80 px-4 py-3 transition-colors ${
          isProposalMode ? "border-primary/30" : "border-border/50"
        }`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none overflow-hidden"
            style={{ minHeight: "1.5rem", maxHeight: "160px" }}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
