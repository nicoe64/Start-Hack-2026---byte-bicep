// src/components/graph/NodeDetailDialog.tsx
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Building2, FileText, Sparkles, Mail } from "lucide-react";

import topics from "@/data/topics.json";
import companies from "@/data/companies.json";
import supervisors from "@/data/supervisors.json";
import experts from "@/data/experts.json";

interface NodeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeData: Record<string, unknown> | null;
}

const iconMap: Record<string, React.ElementType> = {
  company: Building2,
  supervisor: User,
  topic: FileText,
  expert: Sparkles,
};

function formatTag(tag: string) {
  return tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function NodeDetailDialog({ open, onOpenChange, nodeData }: NodeDetailDialogProps) {
  const entityType = nodeData?.entityType as string | undefined;
  const entityId = nodeData?.entityId as string | undefined;
  const name = nodeData?.name as string | undefined;
  const role = nodeData?.role as string | undefined;
  const matchScore = nodeData?.matchScore as number | undefined;
  const tags = nodeData?.tags as string[] | undefined;
  const reasoning = nodeData?.reasoning as string | undefined;

  const hydrated = useMemo(() => {
    if (!entityId || !entityType) return null;
    switch (entityType) {
      case "topic": return topics.find((t: any) => t.id === entityId);
      case "company": return companies.find((c: any) => c.id === entityId);
      case "supervisor": return supervisors.find((s: any) => s.id === entityId);
      case "expert": return experts.find((e: any) => e.id === entityId);
      default: return null;
    }
  }, [entityId, entityType]);

  const Icon = iconMap[entityType || ""] || FileText;

  const description = useMemo(() => {
    if (!hydrated) return null;
    if (entityType === "topic") return (hydrated as any).description;
    if (entityType === "company") return (hydrated as any).about || (hydrated as any).description;
    if (entityType === "supervisor") return (hydrated as any).about;
    if (entityType === "expert") return (hydrated as any).about;
    return null;
  }, [hydrated, entityType]);

  const displayTitle = useMemo(() => {
    if (!hydrated) return name;
    if (entityType === "topic") return (hydrated as any).title;
    if (entityType === "company") return (hydrated as any).name;
    if (entityType === "supervisor")
      return `${(hydrated as any).title} ${(hydrated as any).firstName} ${(hydrated as any).lastName}`;
    if (entityType === "expert")
      return `${(hydrated as any).firstName} ${(hydrated as any).lastName}`;
    return name;
  }, [hydrated, entityType, name]);

  const metaBadges = useMemo(() => {
    if (!hydrated) return [];
    const badges: string[] = [];
    if (entityType === "company") {
      const c = hydrated as any;
      if (c.domains) badges.push(...c.domains);
      if (c.size) badges.push(`${c.size} employees`);
    }
    if (entityType === "topic") {
      const t = hydrated as any;
      if (t.degrees) badges.push(...t.degrees.map((d: string) => d.toUpperCase()));
      if (t.employmentType) badges.push(formatTag(t.employmentType));
      if (t.workplaceType) badges.push(formatTag(t.workplaceType));
    }
    if (entityType === "supervisor") {
      const s = hydrated as any;
      if (s.researchInterests) badges.push(...s.researchInterests);
    }
    if (entityType === "expert") {
      const e = hydrated as any;
      if (e.title) badges.push(e.title);
      if (e.offerInterviews) badges.push("Offers interviews");
    }
    return badges;
  }, [hydrated, entityType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl border-none bg-card p-0 shadow-2xl sm:rounded-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <ScrollArea className="max-h-[80vh]">
            <div className="px-8 pb-8 pt-7">
              <DialogHeader className="mb-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  {matchScore != null && (
                    <Badge
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        matchScore >= 85
                          ? "border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
                          : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {matchScore}% Match
                    </Badge>
                  )}
                </div>
                <DialogTitle className="font-serif text-2xl font-semibold leading-tight tracking-editorial text-card-foreground">
                  {displayTitle}
                </DialogTitle>
                {role && (
                  <DialogDescription className="mt-1 text-sm text-muted-foreground">
                    {role}
                  </DialogDescription>
                )}
              </DialogHeader>

              {metaBadges.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {metaBadges.map((badge) => (
                    <span key={badge} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                      {badge}
                    </span>
                  ))}
                </div>
              )}

              {tags && tags.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
                      {formatTag(tag)}
                    </span>
                  ))}
                </div>
              )}

              {reasoning && (
                <div className="mb-5 rounded-xl bg-muted/50 px-4 py-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
                    Why this fits you
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{reasoning}</p>
                </div>
              )}

              {description && (
                <div className="mb-6">
                  <p className="text-sm leading-[1.75] text-card-foreground/80">{description}</p>
                </div>
              )}

              {hydrated && (entityType === "supervisor" || entityType === "expert") && (hydrated as any).email && (
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" strokeWidth={1.5} />
                  <span>{(hydrated as any).email}</span>
                </div>
              )}

              <p className="text-center text-[11px] text-muted-foreground/50">
                Click the node on the graph to select it for a proposal
              </p>
            </div>
          </ScrollArea>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
