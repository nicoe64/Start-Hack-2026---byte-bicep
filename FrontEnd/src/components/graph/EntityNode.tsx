import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { User, Building2, FileText, Sparkles, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface EntityNodeData {
  name: string;
  role: string;
  institution?: string;
  entityType: "supervisor" | "company" | "topic" | "expert";
  entityId?: string;
  matchScore?: number;
  tags?: string[];
  reasoning?: string;
  onExpand?: (data: EntityNodeData) => void;
  [key: string]: unknown;
}

const iconMap: Record<string, React.ElementType> = {
  company: Building2,
  supervisor: User,
  topic: FileText,
  expert: Sparkles,
};

export const EntityNode = memo(({ data, selected }: NodeProps) => {
  const { name, role, institution, entityType, entityId, matchScore, tags, reasoning, onExpand } = data as unknown as EntityNodeData;
  const Icon = iconMap[entityType] || User;
  const isHigh = (matchScore ?? 0) >= 85;

  return (
    <div
      className={`min-w-[220px] rounded-2xl border bg-card px-6 py-5 transition-colors duration-200 ${
        selected
          ? "border-green-600 shadow-lg"
          : "border-border/50 shadow-md hover:shadow-lg dark:border-blue-400/50"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {matchScore != null && (
            <Badge
              className={`mb-2 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                isHigh
                  ? "border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {matchScore}% Match
            </Badge>
          )}
          <h3 className="font-serif text-base font-semibold text-card-foreground">
            {name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{role}</p>
          {institution && (
            <p className="mt-0.5 text-[11px] text-muted-foreground/60">
              {institution}
            </p>
          )}
        </div>
        <div className="ml-3 flex flex-col items-center gap-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
          </div>
          {onExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand(data as unknown as EntityNodeData);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Expand details"
            >
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
      {tags && tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag: string) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
            >
              {tag.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !rounded-full !border-2 !border-primary !bg-card" />
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !rounded-full !border-2 !border-primary !bg-card" />
    </div>
  );
});

EntityNode.displayName = "EntityNode";
