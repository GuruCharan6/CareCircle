import { cn } from "@/lib/utils";
import type { StalenessIndicator } from "@/lib/types";

interface FreshnessBarProps {
  score: number; // 0–100
  computedAt: string;
  indicators?: StalenessIndicator[];
}

export function FreshnessBar({ score, computedAt, indicators }: FreshnessBarProps) {
  const isFresh = score >= 80;
  const isAging = score >= 50;

  const barColor = isFresh ? "bg-green-500" : isAging ? "bg-yellow-500" : "bg-red-500";
  const borderColor = isFresh ? "border-green-200" : isAging ? "border-yellow-200" : "border-red-200";
  const bgColor = isFresh ? "bg-green-50" : isAging ? "bg-yellow-50" : "bg-red-50";
  const badgeColor = isFresh ? "bg-green-500" : isAging ? "bg-yellow-500" : "bg-red-500";

  const label = isFresh ? "Up to date" : isAging ? "Partially fresh" : "Stale data";

  const sourceLabels: Record<string, string> = {
    lab: "Labs",
    caregiver_note: "Caregiver",
    meera_log: "Observations",
  };

  return (
    <div className={cn("rounded-2xl border p-4", borderColor, bgColor)}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-widest">
          Data Freshness
        </span>
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full text-white", badgeColor)}>
          {score ?? 0}%
        </span>
      </div>

      <div className="w-full bg-white/70 rounded-full h-2.5 mb-4 overflow-hidden">
        <div
          className={cn("h-2.5 rounded-full transition-all duration-700", barColor)}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>

      {indicators && indicators.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
          {indicators.filter(ind => ind.source !== "prescription").map((ind, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full shrink-0",
                ind.status === "fresh" ? "bg-green-500" :
                ind.status === "aging" ? "bg-yellow-500" :
                "bg-red-500"
              )} />
              <span className="text-[11px] font-medium text-[var(--color-text)]">
                {sourceLabels[ind.source] || ind.source}
              </span>
              <span className="text-[10px] text-[var(--color-muted)] ml-auto">
                {ind.days_since === 0 ? "Today" : ind.days_since != null ? `${ind.days_since}d ago` : "None"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center text-[10px] text-[var(--color-muted)]">
        <span className="font-semibold">{label}</span>
        <span className="opacity-70">
          Computed {computedAt ? new Date(computedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
        </span>
      </div>
    </div>
  );
}
