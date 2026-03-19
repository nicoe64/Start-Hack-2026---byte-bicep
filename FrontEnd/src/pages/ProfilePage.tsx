// src/pages/ProfilePage.tsx
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, Upload, Building2, User, FileText, Sparkles,
  Trophy, TrendingUp, BookOpen, CheckCircle2, Loader2
} from "lucide-react";
import { StudyondSidebar } from "@/components/StudyondSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BackendGraphResponse } from "@/components/graph/mockGraphData";

interface ProfilePageProps {
  graphData: BackendGraphResponse | null;
  enrichedProfile: Record<string, unknown>;
  websiteProfile: {
    name?: string;
    university?: string;
    degree_level?: string;
    study_program?: string;
    field_interests?: string[];
    skills?: string[];
    graduation_date?: string;
  };
}

// ── Ranking helpers ────────────────────────────

function buildRankings(graphData: BackendGraphResponse | null) {
  if (!graphData) return { companies: [], people: [], thesis: [] };

  const nodes = graphData.nodes ?? [];
  const paths = graphData.paths ?? [];

  // Score each node: base confidence + boost if in multiple paths
  const nodePathCount: Record<string, number> = {};
  paths.forEach((p) => p.node_ids?.forEach((id) => {
    nodePathCount[id] = (nodePathCount[id] ?? 0) + 1;
  }));

  const score = (n: typeof nodes[0]) =>
    Math.min(100, Math.round((n.confidence ?? 0.5) * 100 + (nodePathCount[n.id] ?? 0) * 5));

  const companies = nodes
    .filter((n) => n.type === "company")
    .map((n) => ({ ...n, score: score(n) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const people = nodes
    .filter((n) => n.type === "supervisor" || n.type === "expert")
    .map((n) => ({ ...n, score: score(n) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const thesis = nodes
    .filter((n) => n.type === "topic")
    .map((n) => ({ ...n, score: score(n) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return { companies, people, thesis };
}

// ── Score bar ──────────────────────────────────

function ScoreBar({ score, rank }: { score: number; rank: number }) {
  const color =
    rank === 1 ? "bg-amber-400" :
    rank === 2 ? "bg-slate-400" :
    rank === 3 ? "bg-orange-400" :
    "bg-primary/60";

  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, delay: rank * 0.04, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-muted-foreground w-8 text-right">
        {score}%
      </span>
    </div>
  );
}

const rankMedal = (i: number) =>
  i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

// ── Ranking table ──────────────────────────────

function RankingTable({
  title,
  icon: Icon,
  items,
  emptyMsg,
}: {
  title: string;
  icon: React.ElementType;
  items: Array<{ id: string; label: string; subtitle: string; score: number }>;
  emptyMsg: string;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-border/30 px-6 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
        </div>
        <span className="text-sm font-semibold text-card-foreground">{title}</span>
        <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Top {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground/50">{emptyMsg}</div>
      ) : (
        <div className="divide-y divide-border/20">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-4 px-6 py-3.5">
              <div className="w-6 shrink-0 text-center">
                {rankMedal(i) ? (
                  <span className="text-base">{rankMedal(i)}</span>
                ) : (
                  <span className="text-xs font-mono font-bold text-muted-foreground/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-card-foreground">{item.label}</p>
                <p className="truncate text-[11px] text-muted-foreground/70">{item.subtitle}</p>
              </div>
              <ScoreBar score={item.score} rank={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AI Description ─────────────────────────────

function buildDescription(
  websiteProfile: ProfilePageProps["websiteProfile"],
  enriched: Record<string, unknown>
): string {
  const name = websiteProfile.name ?? "This student";
  const degree = websiteProfile.degree_level ?? "";
  const program = websiteProfile.study_program ?? "";
  const uni = websiteProfile.university ?? "";
  const skills = (websiteProfile.skills ?? []).slice(0, 4).join(", ");
  const interests = (websiteProfile.field_interests ?? []).slice(0, 3).join(", ");
  const topicIdea = enriched.topic_idea as string | undefined;
  const careerGoal = enriched.career_goal as string | undefined;
  const wantsCompany = enriched.wants_company_partner as boolean | undefined;

  const parts: string[] = [];

  parts.push(`${name} is a ${degree} student in ${program} at ${uni}.`);

  if (skills) parts.push(`Their technical profile includes ${skills}.`);
  if (interests) parts.push(`They have strong interests in ${interests}.`);

  if (topicIdea) parts.push(`For their thesis, they are exploring ${topicIdea}.`);
  if (careerGoal) parts.push(`Their career goal is ${careerGoal}.`);
  if (wantsCompany === true) parts.push("They are open to industry collaboration alongside academic supervision.");
  if (wantsCompany === false) parts.push("They prefer a purely academic thesis environment.");

  return parts.join(" ");
}

// ── Main Page ──────────────────────────────────

export function ProfilePage({
  graphData,
  enrichedProfile,
  websiteProfile,
}: ProfilePageProps) {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rankings = buildRankings(graphData);
  const description = buildDescription(websiteProfile, enrichedProfile);
  const hasGraph = !!graphData;

  const handleFile = (file: File) => {
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setCvFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <StudyondSidebar activePage="Profile" />

      <main className="flex flex-1 overflow-hidden">
        {/* ── Left: Profile ── */}
        <div className="flex w-80 shrink-0 flex-col border-r border-border/40 bg-card/30">
          <ScrollArea className="flex-1">
            <div className="px-8 py-8 space-y-8">

              {/* Avatar + name */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary mb-4">
                    {(websiteProfile.name ?? "??").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <h2 className="font-serif text-xl font-semibold text-card-foreground">
                    {websiteProfile.name ?? "—"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {websiteProfile.degree_level} · {websiteProfile.study_program}
                  </p>
                  <p className="text-xs text-muted-foreground/70">{websiteProfile.university}</p>
                </motion.div>
              </div>

              {/* Info fields */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="space-y-3"
              >
                {[
                  { label: "Degree", value: websiteProfile.degree_level },
                  { label: "Program", value: websiteProfile.study_program },
                  { label: "University", value: websiteProfile.university },
                  { label: "Graduation", value: websiteProfile.graduation_date },
                ]
                  .filter((f) => f.value)
                  .map((f) => (
                    <div key={f.label} className="rounded-xl border border-border/30 bg-background/60 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50 mb-0.5">
                        {f.label}
                      </p>
                      <p className="text-sm text-card-foreground">{f.value}</p>
                    </div>
                  ))}
              </motion.div>

              {/* Skills */}
              {(websiteProfile.skills ?? []).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(websiteProfile.skills ?? []).map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Field interests */}
              {(websiteProfile.field_interests ?? []).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.12 }}
                >
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">
                    Interests
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(websiteProfile.field_interests ?? []).map((f) => (
                      <span
                        key={f}
                        className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* AI-generated description */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="rounded-xl bg-muted/50 px-4 py-4"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                    AI Profile Summary
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </motion.div>

              {/* CV Upload */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.18 }}
              >
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">
                  Curriculum Vitae
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                {cvFile ? (
                  <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 dark:text-green-400" strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-green-700 dark:text-green-400">{cvFile.name}</p>
                      <p className="text-[11px] text-green-600/70 dark:text-green-500/70">
                        {(cvFile.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => setCvFile(null)}
                      className="text-xs text-green-600/60 hover:text-green-700 dark:text-green-500/60"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`w-full rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-border/40 hover:border-border hover:bg-secondary/30"
                    }`}
                  >
                    <Upload className="mx-auto mb-2 h-5 w-5 text-muted-foreground/50" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground/70">Upload CV</p>
                    <p className="text-[11px] text-muted-foreground/40">PDF · drag & drop or click</p>
                  </button>
                )}
              </motion.div>
            </div>
          </ScrollArea>
        </div>

        {/* ── Right: Rankings ── */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-10 py-8">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-8"
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  Personalised for you
                </span>
                <h1 className="mt-1 font-serif text-2xl font-semibold text-foreground lg:text-3xl">
                  Your top <span className="italic text-foreground/70">matches.</span>
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {hasGraph
                    ? "Ranked by AI confidence score and path relevance based on your profile."
                    : "Complete the chat with the AI advisor to see your personalized rankings."}
                </p>
              </motion.div>

              {!hasGraph ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Trophy className="mb-4 h-12 w-12 text-muted-foreground/20" strokeWidth={1} />
                  <p className="font-serif text-lg text-muted-foreground/50">No rankings yet</p>
                  <p className="mt-1 text-sm text-muted-foreground/40">
                    Go back and chat with the AI advisor to generate your paths
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="space-y-6"
                >
                  <RankingTable
                    title="Top Companies"
                    icon={Building2}
                    items={rankings.companies.map((n) => ({
                      id: n.id,
                      label: n.label,
                      subtitle: n.subtitle ?? n.type,
                      score: n.score,
                    }))}
                    emptyMsg="No company nodes in your current graph"
                  />
                  <RankingTable
                    title="Top People"
                    icon={User}
                    items={rankings.people.map((n) => ({
                      id: n.id,
                      label: n.label,
                      subtitle: n.subtitle ?? n.type,
                      score: n.score,
                    }))}
                    emptyMsg="No supervisor or expert nodes in your current graph"
                  />
                  <RankingTable
                    title="Top Thesis Topics"
                    icon={BookOpen}
                    items={rankings.thesis.map((n) => ({
                      id: n.id,
                      label: n.label,
                      subtitle: n.subtitle ?? "",
                      score: n.score,
                    }))}
                    emptyMsg="No topic nodes in your current graph"
                  />
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </div>
      </main>
    </div>
  );
}
