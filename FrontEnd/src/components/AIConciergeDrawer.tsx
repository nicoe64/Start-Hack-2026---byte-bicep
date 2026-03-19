// src/components/AIConciergeDrawer.tsx
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Sparkles, Loader2 } from "lucide-react";

interface Message {
  role: string;
  content: string;
}

interface AIConciergeDrawerProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  questionCount: number;
  maxQuestions: number;
}

export function AIConciergeDrawer({
  messages,
  onSendMessage,
  isLoading,
  questionCount,
  maxQuestions,
}: AIConciergeDrawerProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <aside className="relative flex h-full w-[380px] flex-col overflow-hidden border-l border-border/30">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="ai-glow-bg animate-pulse-glow absolute inset-0" />
        <div className="absolute inset-0 bg-background/60 backdrop-blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 px-6 py-5">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/70">
            AI Thesis Advisor
          </span>
        </div>
        {questionCount > 0 && questionCount < maxQuestions && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
            {questionCount}/{maxQuestions}
          </span>
        )}
      </div>

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
                className={`${
                  msg.role === "user"
                    ? "ml-8 rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground"
                    : "mr-4 rounded-2xl rounded-bl-md bg-card/80 px-4 py-3 text-sm text-card-foreground shadow-sm"
                }`}
              >
                {msg.content}
              </motion.div>
            ))}
            {isLoading && (
              <div className="mr-4 flex items-center gap-2 rounded-2xl bg-card/80 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/30 px-6 py-4">
        <div className="flex items-end gap-2 rounded-2xl border border-border/50 bg-card/80 px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me about your thesis interests..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
