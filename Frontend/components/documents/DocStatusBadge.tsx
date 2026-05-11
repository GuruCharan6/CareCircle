import type { ExtractionStatus } from "@/lib/types";
import { Clock, Loader2, ClipboardCheck, AlertCircle, Eye, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const CONFIG: Record<ExtractionStatus, { label: string; color: string; icon: any; pulse?: boolean }> = {
  pending:         { label: "Pending",        color: "#64748b", icon: Clock },
  extracting:      { label: "Extracting",     color: "#EF9F27", icon: Loader2, pulse: true },
  review_required: { label: "Review Required", color: "#0D3B6E", icon: Eye },
  approved:        { label: "Approved",        color: "#639922", icon: ClipboardCheck },
  rejected:        { label: "Rejected",        color: "#64748b", icon: XCircle },
  failed:          { label: "Failed",          color: "#E24B4A", icon: AlertCircle },
};

interface DocStatusBadgeProps {
  status: ExtractionStatus;
  className?: string;
}

export function DocStatusBadge({ status, className = "" }: DocStatusBadgeProps) {
  const cfg = CONFIG[status];
  const Icon = cfg.icon;

  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border whitespace-nowrap",
        className
      )}
      style={{ 
        backgroundColor: cfg.color + "1A", // 10% opacity hex
        color: cfg.color,
        borderColor: cfg.color + "33" // 20% opacity hex
      }}
    >
      <Icon size={12} className={cn(cfg.pulse && "animate-spin")} strokeWidth={3} />
      {cfg.label.toUpperCase()}
    </span>
  );
}
