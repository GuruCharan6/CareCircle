"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { ObservationCard } from "./ObservationCard";
import type { ObservationResponse, ObservationSource } from "@/lib/types";
import { cn } from "@/lib/utils";

const SOURCE_FILTERS: { label: string; value: ObservationSource | "all" }[] = [
  { label: "All",             value: "all" },
  { label: "Voice Notes",     value: "voice_log" },
  { label: "Caregiver Notes", value: "caregiver_note" },
];

interface ObservationListProps {
  observations: ObservationResponse[];
  activeFilter: ObservationSource | "all";
  onFilterChange: (f: ObservationSource | "all") => void;
  loading?: boolean;
  onLogObservation?: () => void;
}

export function ObservationList({
  observations,
  activeFilter,
  onFilterChange,
  loading,
  onLogObservation,
}: ObservationListProps) {
  const uniqueObservations = useMemo(() => {
    const seen = new Set<string>();
    return observations.filter(obs => {
      if (seen.has(obs.id)) return false;
      seen.add(obs.id);
      return true;
    });
  }, [observations]);

  return (
    <div className="space-y-6">
      {/* Filter tabs + Log button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-[var(--color-surface)] rounded-xl p-1 w-fit">
          {SOURCE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-150 whitespace-nowrap",
                activeFilter === f.value
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={onLogObservation}
          className="w-full sm:w-auto flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-[var(--color-action)] hover:bg-[var(--color-action)]/90 text-white text-sm font-bold transition-colors"
        >
          <Plus size={16} />
          Log Observation
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-36 rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] shadow-[0_1px_3px_rgba(0,0,0,0.08)] animate-pulse" />
          ))}
        </div>
      ) : uniqueObservations.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-muted)] text-sm">
          No observations recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {uniqueObservations.map((obs, i) => (
            <ObservationCard key={obs.id} observation={obs} isFirst={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
