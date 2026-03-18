import { motion } from "framer-motion";
import { Globe, ChevronDown, ArrowUp, Sparkles } from "lucide-react";

const suggestions = [
  {
    match: "98%",
    title: "Optimization of Large Language Models for Edge Deployment",
    supervisor: "Prof. Dr. Maria Steinbach",
    university: "TU Munich",
  },
  {
    match: "94%",
    title: "Federated Learning in Healthcare Data Systems",
    supervisor: "Dr. Jonas Kramer",
    university: "ETH Zurich",
  },
  {
    match: "91%",
    title: "Neural Architecture Search for Resource-Constrained Devices",
    supervisor: "Prof. Lena Hoffmann",
    university: "KIT Karlsruhe",
  },
];

const quickActions = ["Suggest topics for me", "What should I know?"];

export function AIConciergeDrawer() {
  return (
    <aside className="relative flex h-full w-[380px] flex-col overflow-hidden border-l border-border/30">
      {/* Animated glow background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="ai-glow-bg animate-pulse-glow absolute inset-0" />
        <div className="absolute inset-0 bg-background/60 backdrop-blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 px-6 py-5">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/70">
            Topic Suggestions
          </span>
        </div>
        <button className="rounded-lg bg-secondary/60 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary">
          Reset Chat
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {/* Welcome message */}
        <div className="mb-10 text-center">
          <p className="font-serif text-lg text-muted-foreground/70">
            Let's find the best topic for you.
          </p>
        </div>

        {/* AI Suggestions */}
        <div className="space-y-3">
          {suggestions.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ x: 4 }}
              className="group cursor-pointer rounded-2xl bg-card/60 p-5 shadow-none transition-all duration-300 hover:shadow-editorial"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  Match {item.match}
                </span>
              </div>
              <p className="mb-2 font-serif text-[15px] font-medium leading-snug text-foreground">
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.supervisor} · {item.university}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="border-t border-border/30 px-6 py-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action}
              className="rounded-full border border-border/60 bg-card/80 px-4 py-2 text-xs font-medium text-foreground/70 transition-all hover:bg-secondary hover:text-foreground"
            >
              {action}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-end gap-2 rounded-2xl border border-border/50 bg-card/80 px-4 py-3">
          <textarea
            placeholder="What would you like to know?"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              <span>Think</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95">
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
