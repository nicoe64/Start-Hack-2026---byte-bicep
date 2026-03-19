import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GraduationCap, ArrowUpRight } from "lucide-react";

export interface ProfileNodeData {
  name: string;
  degree: string;
  interests: string[];
  onExpand?: (data: ProfileNodeData) => void;
  [key: string]: unknown;
}

export const ProfileNode = memo(({ data, selected }: NodeProps) => {
  const { name, degree, interests, onExpand } = data as unknown as ProfileNodeData;

  return (
    <div
      className={`min-w-[260px] rounded-2xl border bg-card px-6 py-5 transition-colors duration-200 ${
        selected
          ? "border-green-600 shadow-lg"
          : "border-border/50 shadow-md hover:shadow-lg dark:border-blue-400/50"
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-serif text-lg font-semibold text-card-foreground">
            {name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{degree}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-4 w-4 text-primary" strokeWidth={1.5} />
          </div>
          {onExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand(data as unknown as ProfileNodeData);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Expand details"
            >
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
      {interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {interests.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !rounded-full !border-2 !border-primary !bg-card" />
    </div>
  );
});

ProfileNode.displayName = "ProfileNode";
