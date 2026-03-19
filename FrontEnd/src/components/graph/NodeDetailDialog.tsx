import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  Building2,
  FileText,
  Sparkles,
  Briefcase,
  MapPin,
  GraduationCap,
  Mail,
  MessageSquare,
  Bookmark,
} from "lucide-react";

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
      case "topic":
        return topics.find((t: any) => t.id === entityId);
      case "company":
        return companies.find((c: any) => c.id === entityId);
      case "supervisor":
        return supervisors.find((s: any) => s.id === entityId);
      case "expert":
        return experts.find((e: any) => e.id === entityId);
      default:
        return null;
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
              {/* Header */}
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

              {/* Meta badges */}
              {metaBadges.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {metaBadges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}

              {/* Tags from graph data */}
              {tags && tags.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary"
                    >
                      {formatTag(tag)}
                    </span>
                  ))}
                </div>
              )}

              {/* AI Reasoning */}
              {reasoning && (
                <div className="mb-5 rounded-xl bg-muted/50 px-4 py-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
                    AI Reasoning
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{reasoning}</p>
                </div>
              )}

              {/* Rich description */}
              {description && (
                <div className="mb-6">
                  <p className="text-sm leading-[1.75] text-card-foreground/80">
                    {description}
                  </p>
                </div>
              )}

              {/* Contact info for people */}
              {hydrated && (entityType === "supervisor" || entityType === "expert") && (hydrated as any).email && (
                <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" strokeWidth={1.5} />
                  <span>{(hydrated as any).email}</span>
                </div>
              )}

              {/* CTA buttons */}
              <div className="flex gap-2">
                <Button className="flex-1 gap-2 rounded-xl" size="lg">
                  <MessageSquare className="h-4 w-4" />
                  Ask AI about this
                </Button>
                <Button variant="outline" className="gap-2 rounded-xl" size="lg">
                  <Bookmark className="h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>
          </ScrollArea>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
