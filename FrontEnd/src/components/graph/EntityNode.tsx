// src/components/graph/EntityNode.tsx
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { User, Building2, FileText, Sparkles, Info } from "lucide-react";
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
  isSelected?: boolean;
  onExpand?: (data: EntityNodeData) => void;
  [key: string]: unknown;
}

const iconMap: Record<string, React.ElementType> = {
  company: Building2,
  supervisor: User,
  topic: FileText,
  expert: Sparkles,
};

export const EntityNode = memo(({ data }: NodeProps) => {
  const {
    name,
    role,
    institution,
    entityType,
    matchScore,
    tags,
    isSelected,
    onExpand,
  } = data as unknown as EntityNodeData;

  const Icon = iconMap[entityType] || User;
  const isHigh = (matchScore ?? 0) >= 85;

  return (
    <div
      className={`min-w-[220px] rounded-2xl border bg-card px-6 py-5 transition-all duration-150 cursor-pointer select-none ${
        isSelected
          ? "border-green-500 shadow-lg ring-2 ring-green-500/25 bg-green-50/30 dark:bg-green-950/20"
          : "border-border/50 shadow-md hover:shadow-lg hover:border-border dark:border-blue-400/50"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
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
          <h3 className="font-serif text-base font-semibold text-card-foreground truncate pr-1">
            {name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground truncate">{role}</p>
          {institution && (
            <p className="mt-0.5 text-[11px] text-muted-foreground/60 truncate">
              {institution}
            </p>
          )}
        </div>

        <div className="ml-3 flex flex-col items-center gap-1.5 shrink-0">
          {/* Entity type icon */}
          <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            isSelected ? "bg-green-100 dark:bg-green-900" : "bg-primary/10"
          }`}>
            <Icon className={`h-4 w-4 ${isSelected ? "text-green-600 dark:text-green-400" : "text-primary"}`} strokeWidth={1.5} />
          </div>

          {/* Info button — stops propagation, opens dialog, does NOT select */}
          {onExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand(data as unknown as EntityNodeData);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="View details"
              title="View details"
            >
              <Info className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {tags && tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag: string) => (
            <span
              key={tag}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                isSelected
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {tag.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
            Selected for proposal
          </span>
        </div>
      )}

      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !rounded-full !border-2 !border-primary !bg-card" />
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !rounded-full !border-2 !border-primary !bg-card" />
    </div>
  );
});

EntityNode.displayName = "EntityNode";
