"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { usePatient } from "@/hooks/usePatient";
import { useObservations } from "@/hooks/useObservations";
import { ObservationList } from "@/components/observations/ObservationList";
import type { ObservationSource } from "@/lib/types";

type Filter = ObservationSource | "all";

export default function ObservationsPage() {
  const { activePatient } = usePatient();
  const { observations, loading, error, fetch } = useObservations();
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!activePatient) return;
    const sourceType = filter === "all" ? undefined : filter;
    fetch(activePatient.id, sourceType);
  }, [activePatient?.id, filter, fetch]);

  if (!activePatient) {
    return <p className="text-[var(--color-muted)] text-sm">No patient selected.</p>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">Observations</h1>
        <p className="text-sm text-[var(--color-muted)] mt-0.5">
          Daily health observations, symptoms &amp; mood logs
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-sm font-medium">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <ObservationList
        observations={observations}
        activeFilter={filter}
        onFilterChange={f => setFilter(f)}
        loading={loading}
        onLogObservation={() => {/* TODO: open log modal */}}
      />
    </div>
  );
}
