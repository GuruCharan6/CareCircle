"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import type { ObservationResponse } from "@/lib/types";
import { Card } from "@/components/ui/Card";

interface ObservationCardProps {
  observation: ObservationResponse;
  isFirst?: boolean;
}

function getTitle(obs: ObservationResponse): string {
  const hour = new Date(obs.created_at).getHours();
  const timeOfDay = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  if (obs.source_type === "caregiver_voice") {
    return `${timeOfDay} Observation — Caregiver ${obs.caregiver_name || ""}`.trim();
  }
  return `${timeOfDay} Check — Voice Note`;
}

export function ObservationCard({ observation: obs, isFirst = false }: ObservationCardProps) {
  const isWatch = (obs.concerns_flagged?.length > 0) || (obs.symptoms_reported?.length > 0);

  const dateStr = new Date(obs.observation_date).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
  const timeStr = new Date(obs.created_at).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });

  const title = getTitle(obs);

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

  const meals = obs.meals_eaten as unknown as Record<string, boolean | null> | null;
  const mealText = obs.meal_notes ||
    (meals
      ? Object.entries(meals)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v ? "✓" : "✗"}`)
        .join(" · ")
      : null);

  const medText = obs.medications_taken != null
    ? obs.medications_taken
      ? `On time${obs.medication_timing_notes ? ` · ${obs.medication_timing_notes}` : ""}`
      : `Missed${obs.medication_timing_notes ? ` · ${obs.medication_timing_notes}` : ""}`
    : null;

  return (
    <div className="relative pl-8 pb-3 last:pb-0">
      {/* Timeline vertical line */}
      <div className="absolute left-[4px] top-6 bottom-0 w-px bg-[var(--color-border)] last:hidden" />

      {/* Timeline dot — 10px */}
      {isFirst ? (
        <div className="absolute left-0 top-3 w-2.5 h-2.5 rounded-full bg-[var(--color-ok)] z-10" />
      ) : (
        <div className="absolute left-0 top-3 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-border)] bg-white z-10" />
      )}

      {/* Card */}
      <Card padding="none" className="hover:shadow-md transition-shadow">
        <div className="px-4 py-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[var(--color-text)] leading-snug">{title}</h3>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                {obs.source_type.replace(/_/g, " ")} · {dateStr} · {timeStr}
              </p>
            </div>
            {isWatch ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-watch)]/10 text-[var(--color-watch)] border border-[var(--color-watch)]/25 whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-watch)] animate-pulse" />
                WATCH
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-ok)]/10 text-[var(--color-ok)] border border-[var(--color-ok)]/25 whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ok)]" />
                OK
              </span>
            )}
          </div>

          {/* Clinical fields */}
          <div className="space-y-2 text-sm leading-relaxed">
            {(obs.symptoms_reported?.length ?? 0) > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[var(--color-text)] shrink-0">Symptoms reported:</span>
                {obs.symptoms_reported.map(s => (
                  <span
                    key={s}
                    className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-500 border border-red-100"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {(obs.symptoms_denied?.length ?? 0) > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[var(--color-text)] shrink-0">Symptoms denied:</span>
                {obs.symptoms_denied.map(s => (
                  <span
                    key={s}
                    className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600 border border-green-100"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {mealText && (
              <p className="text-[var(--color-muted)]">
                <span className="font-bold text-[var(--color-text)]">Meals:</span> {mealText}
              </p>
            )}

            {medText && (
              <div className="flex items-center gap-2 text-[var(--color-muted)]">
                <span className="font-bold text-[var(--color-text)]">Medications taken:</span>
                <div className="flex items-center gap-1.5">
                  {obs.medications_taken ? (
                    <CheckCircle2 size={14} className="text-[var(--color-ok)] shrink-0" />
                  ) : (
                    <AlertCircle size={14} className="text-[var(--color-alert)] shrink-0" />
                  )}
                  <span className={obs.medications_taken ? "text-[var(--color-ok)] font-medium" : "text-[var(--color-alert)] font-medium"}>
                    {medText}
                  </span>
                </div>
              </div>
            )}

            {(obs.mood || obs.energy_level) && (
              <p className="text-[var(--color-muted)]">
                {obs.mood && (
                  <><span className="font-bold text-[var(--color-text)]">Mood:</span> {capitalize(obs.mood)}</>
                )}
                {obs.mood && obs.energy_level && (
                  <span className="opacity-30 mx-2">·</span>
                )}
                {obs.energy_level && (
                  <><span className="font-bold text-[var(--color-text)]">Energy:</span> {capitalize(obs.energy_level)}</>
                )}
              </p>
            )}

            {obs.mobility_notes && (
              <p className="text-[var(--color-muted)]">
                <span className="font-bold text-[var(--color-text)]">Mobility:</span> {obs.mobility_notes}
              </p>
            )}

            {(obs.concerns_flagged?.length ?? 0) > 0 && (
              <p className="text-[var(--color-muted)]">
                <span className="font-bold text-[var(--color-text)]">Concerns flagged:</span>{" "}
                {obs.concerns_flagged.join(" — ")}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
