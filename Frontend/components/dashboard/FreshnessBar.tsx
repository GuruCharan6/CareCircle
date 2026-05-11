import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { StalenessIndicator } from "@/lib/types";

interface FreshnessBarProps {
  score: number; // 0–100
  computedAt: string;
  indicators?: StalenessIndicator[];
}

export function FreshnessBar({ score, computedAt, indicators }: FreshnessBarProps) {
  const color =
    score >= 80 ? "bg-green-500"
    : score >= 50 ? "bg-yellow-500"
    : "bg-red-500";

  const label =
    score >= 80 ? "Up to date"
    : score >= 50 ? "Partially fresh"
    : "Stale data";

  const sourceLabels: Record<string, string> = {
    lab: "Labs",
    caregiver_note: "Caregiver",
    meera_log: "Logs",
    prescription: "Scripts"
  };

  return (
    <Card padding="md">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">
          Data Freshness
        </span>
        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white", color)}>
          {score ?? 0}%
        </span>
      </div>
      
      <div className="w-full bg-[var(--color-border)] rounded-full h-1.5 mb-4">
        <div
          className={cn("h-1.5 rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(indicators || []).map((ind, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", 
              ind.status === 'fresh' ? 'bg-green-500' :
              ind.status === 'aging' ? 'bg-yellow-500' :
              'bg-red-500'
            )} />
            <span className="text-[10px] font-medium text-[var(--color-muted)]">
              {sourceLabels[ind.source] || ind.source}
            </span>
            <span className="text-[9px] text-[var(--color-muted)] ml-auto opacity-70">
              {ind.days_since === 0 ? 'Today' : ind.days_since ? `${ind.days_since}d` : 'None'}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex justify-between items-center text-[10px] text-[var(--color-muted)]">
        <span className="font-medium">{label}</span>
        <span className="opacity-70">
          Updated {computedAt ? new Date(computedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
        </span>
      </div>
    </Card>
  );
}
