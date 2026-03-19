// src/pages/ProfilePage.tsx
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload, CheckCircle2, Sparkles, Building2, User,
  BookOpen, TrendingUp,
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

// ── Rankings ───────────────────────────────────

function buildRankings(graphData: BackendGraphResponse | null) {
  if (!graphData) return { companies: [], people: [], thesis: [] };
  const nodes = graphData.nodes ?? [];
  const paths = graphData.paths ?? [];
  const nodePathCount: Record<string, number> = {};
  paths.forEach((p) => p.node_ids?.forEach((id) => {
    nodePathCount[id] = (nodePathCount[id] ?? 0) + 1;
  }));
  const score = (n: typeof nodes[0]) =>
    Math.min(99, Math.round((n.confidence ?? 0.5) * 100) + (nodePathCount[n.id] ?? 0) * 3);
  const sorted = (type: string) =>
    nodes.filter((n) => n.type === type)
      .map((n) => ({ ...n, score: score(n) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  return {
    companies: sorted("company"),
    people: [...sorted("supervisor"), ...sorted("expert")]
      .sort((a, b) => (b as any).score - (a as any).score).slice(0, 10),
    thesis: sorted("topic"),
  };
}

function buildDescription(
  wp: ProfilePageProps["websiteProfile"],
  enriched: Record<string, unknown>
): string {
  const parts: string[] = [];
  if (wp.name && wp.degree_level && wp.study_program && wp.university)
    parts.push(`${wp.name} is a ${wp.degree_level} student in ${wp.study_program} at ${wp.university}.`);
  const skills = (wp.skills ?? []).slice(0, 4);
  if (skills.length) parts.push(`Their technical profile includes ${skills.join(", ")}.`);
  const interests = (wp.field_interests ?? []).slice(0, 3);
  if (interests.length) parts.push(`They have strong interests in ${interests.join(", ")}.`);
  const topicIdea = enriched.topic_idea as string | undefined;
  const careerGoal = enriched.career_goal as string | undefined;
  if (topicIdea) parts.push(`For their thesis, they are exploring ${topicIdea}.`);
  if (careerGoal) parts.push(`Their career goal is ${careerGoal}.`);
  if (!parts.length) parts.push("Complete the AI chat to generate your profile summary.");
  return parts.join(" ");
}

// ── Donut Chart ────────────────────────────────

function DonutChart({ value, color, size = 56 }: { value: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const cx = size / 2;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth={7} />
      <motion.circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth={7} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
      />
    </svg>
  );
}

// ── Pie Chart SVG ──────────────────────────────

interface PieSlice { label: string; value: number; color: string }

function PieChart({ slices, size = 160 }: { slices: PieSlice[]; size?: number }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const innerR = r * 0.52; // donut hole

  let cumAngle = -Math.PI / 2; // start from top

  const paths = slices.map((sl, i) => {
    const angle = (sl.value / total) * 2 * Math.PI;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      "Z",
    ].join(" ");

    return { d, color: sl.color, key: i };
  });

  return (
    <svg width={size} height={size}>
      {paths.map((p) => (
        <motion.path
          key={p.key}
          d={p.d}
          fill={p.color}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: p.key * 0.08, ease: "easeOut" }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      ))}
    </svg>
  );
}

// ── Metric card ────────────────────────────────

function MetricCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: number; sub?: string; color: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card px-5 py-4 flex items-center gap-4">
      <div className="relative shrink-0">
        <DonutChart value={value} color={color} size={56} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-4 w-4" style={{ color }} strokeWidth={1.5} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50 mb-0.5">{label}</p>
        <p className="text-xl font-semibold tabular-nums text-card-foreground">{value}%</p>
        {sub && <p className="text-[11px] text-muted-foreground/70 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ── Bar row ────────────────────────────────────

function BarRow({ rank, label, subtitle, score, color, delay }: {
  rank: number; label: string; subtitle: string; score: number; color: string; delay: number;
}) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/20 last:border-0">
      <div className="w-7 shrink-0 text-center">
        {medal
          ? <span className="text-sm">{medal}</span>
          : <span className="text-[11px] font-mono font-bold text-muted-foreground/35">{String(rank).padStart(2, "0")}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-card-foreground leading-tight">{label}</p>
        {subtitle && <p className="truncate text-[11px] text-muted-foreground/60">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.7, delay, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground w-7 text-right">
          {score}%
        </span>
      </div>
    </div>
  );
}

// ── Ranking panel ──────────────────────────────

function RankingPanel({ title, icon: Icon, items, color, emptyMsg }: {
  title: string;
  icon: React.ElementType;
  items: Array<{ id: string; label: string; subtitle: string; score: number }>;
  color: string;
  emptyMsg: string;
}) {
  const avg = items.length ? Math.round(items.reduce((s, i) => s + i.score, 0) / items.length) : 0;
  const top = items[0];
  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/30 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${color}18` }}>
            <Icon className="h-4 w-4" style={{ color }} strokeWidth={1.5} />
          </div>
          <span className="text-sm font-semibold text-card-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Avg score</p>
                <p className="text-sm font-semibold tabular-nums" style={{ color }}>{avg}%</p>
              </div>
              <div className="relative shrink-0">
                <DonutChart value={avg} color={color} size={44} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] font-bold" style={{ color }}>{avg}</span>
                </div>
              </div>
            </>
          )}
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Top {items.length}
          </span>
        </div>
      </div>

      {top && (
        <div className="mx-6 mt-4 mb-2 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: `${color}10` }}>
          <TrendingUp className="h-4 w-4 shrink-0" style={{ color }} strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: `${color}aa` }}>Top match</p>
            <p className="text-sm font-semibold text-card-foreground truncate">{top.label}</p>
          </div>
          <span className="text-lg font-bold tabular-nums shrink-0" style={{ color }}>{top.score}%</span>
        </div>
      )}

      <div className="px-6 pb-4">
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground/40">{emptyMsg}</div>
        ) : (
          items.map((item, i) => (
            <BarRow key={item.id} rank={i + 1} label={item.label} subtitle={item.subtitle}
              score={item.score} color={color} delay={i * 0.04} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Distribution Pie Panel ─────────────────────

const PIE_COLORS = {
  company: "hsl(217, 91%, 55%)",
  supervisor: "hsl(280, 87%, 55%)",
  expert: "hsl(280, 60%, 70%)",
  topic: "hsl(142, 71%, 38%)",
};

function DistributionPanel({ graphData }: { graphData: BackendGraphResponse }) {
  const nodes = graphData.nodes ?? [];
  const counts = {
    company: nodes.filter((n) => n.type === "company").length,
    supervisor: nodes.filter((n) => n.type === "supervisor").length,
    expert: nodes.filter((n) => n.type === "expert").length,
    topic: nodes.filter((n) => n.type === "topic").length,
  };
  const total = Object.values(counts).reduce((s, v) => s + v, 0);

  const slices: PieSlice[] = [
    { label: "Companies", value: counts.company, color: PIE_COLORS.company },
    { label: "Supervisors", value: counts.supervisor, color: PIE_COLORS.supervisor },
    { label: "Experts", value: counts.expert, color: PIE_COLORS.expert },
    { label: "Topics", value: counts.topic, color: PIE_COLORS.topic },
  ].filter((s) => s.value > 0);

  const avgConf = nodes.length
    ? Math.round(nodes.reduce((s, n) => s + (n.confidence ?? 0), 0) / nodes.length * 100)
    : 0;

  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <div className="border-b border-border/30 px-6 py-4">
        <span className="text-sm font-semibold text-card-foreground">Match Distribution</span>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
          {total} entities across {(graphData.paths ?? []).length} paths
        </p>
      </div>
      <div className="flex items-center gap-6 px-6 py-5">
        {/* Pie */}
        <div className="relative shrink-0">
          <PieChart slices={slices} size={140} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold tabular-nums text-card-foreground">{avgConf}%</span>
            <span className="text-[10px] text-muted-foreground/60">avg match</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2.5">
          {slices.map((sl) => (
            <div key={sl.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: sl.color }} />
                <span className="text-sm text-card-foreground">{sl.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(sl.value / total) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: sl.color }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums text-muted-foreground w-6 text-right">
                  {sl.value}
                </span>
                <span className="text-[10px] text-muted-foreground/50 w-7 text-right">
                  {Math.round((sl.value / total) * 100)}%
                </span>
              </div>
            </div>
          ))}

          <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground/60">Total entities</span>
            <span className="text-sm font-semibold text-card-foreground">{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────

export function ProfilePage({ graphData, enrichedProfile, websiteProfile }: ProfilePageProps) {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rankings = buildRankings(graphData);
  const description = buildDescription(websiteProfile, enrichedProfile);
  const hasGraph = !!graphData;

  const topCompany = rankings.companies[0];
  const topPerson = rankings.people[0];
  const avgConfidence = hasGraph
    ? Math.round((graphData!.paths ?? []).reduce((s, p) => s + p.confidence, 0) /
        Math.max(1, (graphData!.paths ?? []).length) * 100)
    : 0;

  const handleFile = (file: File) => {
    if (file.name.endsWith(".pdf")) setCvFile(file);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <StudyondSidebar />

      <main className="flex flex-1 overflow-hidden">

        {/* ── Left: Profile ── */}
        <div className="flex w-72 shrink-0 flex-col border-r border-border/40 bg-card/20">
          <ScrollArea className="flex-1">
            <div className="px-7 py-8 space-y-7">

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary mb-4">
                  {(websiteProfile.name ?? "??").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <h2 className="font-serif text-xl font-semibold text-card-foreground">
                  {websiteProfile.name ?? "—"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {websiteProfile.degree_level} · {websiteProfile.study_program}
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">{websiteProfile.university}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="space-y-2"
              >
                {[
                  { label: "Degree", value: websiteProfile.degree_level },
                  { label: "Program", value: websiteProfile.study_program },
                  { label: "University", value: websiteProfile.university },
                  { label: "Graduation", value: websiteProfile.graduation_date },
                ].filter((f) => f.value).map((f) => (
                  <div key={f.label} className="rounded-xl border border-border/30 bg-background/50 px-4 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/40 mb-0.5">{f.label}</p>
                    <p className="text-sm text-card-foreground">{f.value}</p>
                  </div>
                ))}
              </motion.div>

              {(websiteProfile.skills ?? []).length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(websiteProfile.skills ?? []).map((s) => (
                      <span key={s} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">{s}</span>
                    ))}
                  </div>
                </motion.div>
              )}

              {(websiteProfile.field_interests ?? []).length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40">Interests</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(websiteProfile.field_interests ?? []).map((f) => (
                      <span key={f} className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">{f}</span>
                    ))}
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                className="rounded-xl bg-muted/40 px-4 py-4"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">AI Summary</p>
                </div>
                <p className="text-[12px] leading-relaxed text-muted-foreground">{description}</p>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40">Curriculum Vitae</p>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                {cvFile ? (
                  <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-green-700 dark:text-green-400">{cvFile.name}</p>
                      <p className="text-[11px] text-green-600/60">{(cvFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button onClick={() => setCvFile(null)} className="text-xs text-green-600/50 hover:text-green-700">Remove</button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                    className={`w-full rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border/40 hover:border-border hover:bg-secondary/30"}`}
                  >
                    <Upload className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground/40" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground/60">Upload CV (PDF)</p>
                    <p className="text-[11px] text-muted-foreground/35 mt-0.5">drag & drop or click</p>
                  </button>
                )}
              </motion.div>
            </div>
          </ScrollArea>
        </div>

        {/* ── Right: Dashboard ── */}
        <div className="flex-1 overflow-hidden bg-background">
          <ScrollArea className="h-full">
            <div className="px-8 py-8">
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Personalised for you</span>
                <h1 className="mt-1 font-serif text-2xl font-semibold text-foreground">
                  Your top <span className="italic text-foreground/60">matches.</span>
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hasGraph
                    ? "Ranked by AI confidence score and path relevance."
                    : "Complete the AI chat to see your personalized rankings."}
                </p>
              </motion.div>

              {!hasGraph ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="mb-4 h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
                    <TrendingUp className="h-8 w-8 text-muted-foreground/30" strokeWidth={1} />
                  </div>
                  <p className="font-serif text-lg text-muted-foreground/50">No data yet</p>
                  <p className="mt-1 text-sm text-muted-foreground/35">Go back and chat with the AI advisor</p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="space-y-6"
                >
                  {/* Metric cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <MetricCard label="Match confidence" value={avgConfidence}
                      sub={`${(graphData!.paths ?? []).length} paths generated`}
                      color="hsl(142, 71%, 35%)" icon={TrendingUp} />
                    <MetricCard label="Top company" value={topCompany?.score ?? 0}
                      sub={topCompany?.label ?? "—"}
                      color="hsl(217, 91%, 50%)" icon={Building2} />
                    <MetricCard label="Top supervisor" value={topPerson?.score ?? 0}
                      sub={topPerson?.label ?? "—"}
                      color="hsl(280, 87%, 55%)" icon={User} />
                  </div>

                  {/* Distribution pie chart */}
                  <DistributionPanel graphData={graphData!} />

                  {/* Rankings */}
                  <RankingPanel title="Top Companies" icon={Building2}
                    items={rankings.companies.map((n) => ({ id: n.id, label: n.label, subtitle: n.subtitle ?? "", score: n.score }))}
                    color="hsl(217, 91%, 50%)" emptyMsg="No company nodes in your current graph" />
                  <RankingPanel title="Top People" icon={User}
                    items={rankings.people.map((n) => ({ id: n.id, label: n.label, subtitle: n.subtitle ?? "", score: (n as any).score }))}
                    color="hsl(280, 87%, 55%)" emptyMsg="No supervisor or expert nodes in your current graph" />
                  <RankingPanel title="Top Thesis Topics" icon={BookOpen}
                    items={rankings.thesis.map((n) => ({ id: n.id, label: n.label, subtitle: n.subtitle ?? "", score: n.score }))}
                    color="hsl(142, 71%, 35%)" emptyMsg="No topic nodes in your current graph" />
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </div>
      </main>
    </div>
  );
}
