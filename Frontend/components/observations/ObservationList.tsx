"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { ObservationCard } from "./ObservationCard";
import type { ObservationResponse, ObservationSource } from "@/lib/types";

const SOURCE_FILTERS: { label: string; value: ObservationSource | "all" }[] = [
  { label: "All",             value: "all" },
  { label: "Voice Notes",     value: "voice_log" },
  { label: "Caregiver Notes", value: "caregiver_voice" },
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
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
          {SOURCE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={`px-5 py-2 text-sm font-semibold transition-colors border-r border-[var(--color-border)] last:border-r-0 ${
                activeFilter === f.value
                  ? "bg-white text-[var(--color-primary)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={onLogObservation}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-action)] hover:bg-[var(--color-action)]/90 text-white text-sm font-bold transition-colors"
        >
          <Plus size={16} />
          Log Observation
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-36 rounded-2xl bg-[var(--color-border)] animate-pulse" />
          ))}
        </div>
      ) : uniqueObservations.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-muted)] text-sm">
          No observations recorded yet.
        </div>
      ) : (
        <div>
          {uniqueObservations.map((obs, i) => (
            <ObservationCard key={obs.id} observation={obs} isFirst={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
