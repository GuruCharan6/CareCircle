import { cn } from "@/lib/utils";
import type { ChatQueryType } from "@/lib/types";

const LABELS: Record<ChatQueryType, string> = {
  sql:      "SQL",
  semantic: "Semantic",
  hybrid:   "Hybrid",
};

const COLORS: Record<ChatQueryType, string> = {
  sql:      "bg-blue-100 text-blue-700",
  semantic: "bg-purple-100 text-purple-700",
  hybrid:   "bg-teal-100 text-teal-700",
};

interface Props {
  queryType: ChatQueryType;
  className?: string;
}

export function RouteTag({ queryType, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
        COLORS[queryType],
        className
      )}
    >
      {LABELS[queryType]}
    </span>
  );
}
