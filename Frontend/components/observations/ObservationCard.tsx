"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import type { ObservationResponse } from "@/lib/types";

interface ObservationCardProps {
  observation: ObservationResponse;
  isFirst?: boolean;
}

function getTitle(obs: ObservationResponse): string {
  const hour = new Date(obs.created_at).getHours();
  const timeOfDay = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  if (obs.source_type === "caregiver_note") {
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

  const meals = obs.meals_eaten as Record<string, boolean | null> | null;
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
    <div className="relative pl-10 pb-4 last:pb-0">
      {/* Timeline line — hidden on last card */}
      <div className="absolute left-[10px] top-6 bottom-0 w-px bg-[var(--color-border)] last:hidden" />

      {/* Timeline dot */}
      {isFirst ? (
        <div className="absolute left-0 top-3 w-5 h-5 rounded-full bg-[var(--color-ok)] flex items-center justify-center z-10">
          <div className="w-2 h-2 rounded-full bg-white" />
        </div>
      ) : (
        <div className="absolute left-0 top-3 w-5 h-5 rounded-full border-2 border-[var(--color-border)] bg-white z-10" />
      )}

      {/* Card */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] px-5 py-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-primary)]">{title}</h3>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              {obs.source_type} · {dateStr} · {timeStr}
            </p>
          </div>
          {isWatch ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--color-watch)]/10 text-[var(--color-watch)] border border-[var(--color-watch)]/20 whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-watch)] animate-pulse" />
              WATCH
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--color-ok)]/10 text-[var(--color-ok)] border border-[var(--color-ok)]/20 whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ok)]" />
              OK
            </span>
          )}
        </div>

        {/* Clinical fields */}
        <div className="space-y-1.5 text-sm">
          {(obs.symptoms_reported?.length ?? 0) > 0 && (
            <div className="flex items-start gap-2 flex-wrap">
              <span className="font-semibold text-[var(--color-text)] shrink-0">Symptoms reported:</span>
              {obs.symptoms_reported.map(s => (
                <span
                  key={s}
                  className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-alert)]/10 text-[var(--color-alert)] border border-[var(--color-alert)]/20"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {(obs.symptoms_denied?.length ?? 0) > 0 && (
            <div className="flex items-start gap-2 flex-wrap">
              <span className="font-semibold text-[var(--color-text)] shrink-0">Symptoms denied:</span>
              {obs.symptoms_denied.map(s => (
                <span
                  key={s}
                  className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-ok)]/10 text-[var(--color-ok)] border border-[var(--color-ok)]/20"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {mealText && (
            <p className="text-[var(--color-text)]">
              <span className="font-semibold">Meals:</span> {mealText}
            </p>
          )}

          {medText && (
            <p className="flex items-center gap-1.5 text-[var(--color-text)]">
              <span className="font-semibold">Medications taken:</span>
              {obs.medications_taken ? (
                <CheckCircle2 size={14} className="text-[var(--color-ok)] shrink-0" />
              ) : (
                <AlertCircle size={14} className="text-[var(--color-alert)] shrink-0" />
              )}
              <span className={obs.medications_taken ? "text-[var(--color-ok)]" : "text-[var(--color-alert)]"}>
                {medText}
              </span>
            </p>
          )}

          {(obs.mood || obs.energy_level) && (
            <p className="text-[var(--color-text)]">
              {obs.mood && (
                <><span className="font-semibold">Mood:</span> {obs.mood}</>
              )}
              {obs.mood && obs.energy_level && (
                <span className="text-[var(--color-muted)]"> · </span>
              )}
              {obs.energy_level && (
                <><span className="font-semibold">Energy:</span> {obs.energy_level}</>
              )}
            </p>
          )}

          {obs.mobility_notes && (
            <p className="text-[var(--color-text)]">
              <span className="font-semibold">Mobility:</span> {obs.mobility_notes}
            </p>
          )}

          {(obs.concerns_flagged?.length ?? 0) > 0 && (
            <p className="text-[var(--color-text)]">
              <span className="font-semibold">Concerns flagged:</span>{" "}
              {obs.concerns_flagged.join(" — ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
