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
    <div className="relative pl-10 pb-4 last:pb-0">
      {/* Timeline line — hidden on last card */}
      <div className="absolute left-[10px] top-6 bottom-0 w-px bg-[var(--color-border)] last:hidden" />

      {/* Timeline dot */}
      {isFirst ? (
        <div className="absolute left-0 top-3 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center z-10">
          <div className="w-2 h-2 rounded-full bg-white" />
        </div>
      ) : (
        <div className="absolute left-0 top-3 w-5 h-5 rounded-full border-2 border-slate-200 bg-white z-10" />
      )}

      {/* Card */}
      <div className="bg-white rounded-2xl border border-slate-100 px-6 py-5 shadow-sm hover:shadow-md transition-shadow">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              {obs.source_type.replace(/_/g, " ")}  ·  {dateStr}  ·  {timeStr}
            </p>
          </div>
          {isWatch ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-orange-50 text-orange-600 border border-orange-100 whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              WATCH
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-green-50 text-green-600 border border-green-100 whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              OK
            </span>
          )}
        </div>

        {/* Clinical fields */}
        <div className="space-y-3 text-[13px] leading-relaxed">
          {(obs.symptoms_reported?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 shrink-0">Symptoms reported:</span>
              {obs.symptoms_reported.map(s => (
                <span
                  key={s}
                  className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-500 border border-rose-100"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {(obs.symptoms_denied?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 shrink-0">Symptoms denied:</span>
              {obs.symptoms_denied.map(s => (
                <span
                  key={s}
                  className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-600 border border-green-100"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {mealText && (
            <p className="text-slate-600">
              <span className="font-bold text-slate-700">Meals:</span> {mealText}
            </p>
          )}

          {medText && (
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-bold text-slate-700">Medications taken:</span>
              <div className="flex items-center gap-1.5">
                {obs.medications_taken ? (
                  <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                ) : (
                  <AlertCircle size={14} className="text-rose-500 shrink-0" />
                )}
                <span className={obs.medications_taken ? "text-green-600 font-medium" : "text-rose-500 font-medium"}>
                  {medText}
                </span>
              </div>
            </div>
          )}

          {(obs.mood || obs.energy_level) && (
            <p className="text-slate-600">
              {obs.mood && (
                <><span className="font-bold text-slate-700">Mood:</span> {capitalize(obs.mood)}</>
              )}
              {obs.mood && obs.energy_level && (
                <span className="text-slate-300 mx-2">·</span>
              )}
              {obs.energy_level && (
                <><span className="font-bold text-slate-700">Energy:</span> {capitalize(obs.energy_level)}</>
              )}
            </p>
          )}

          {obs.mobility_notes && (
            <p className="text-slate-600">
              <span className="font-bold text-slate-700">Mobility:</span> {obs.mobility_notes}
            </p>
          )}

          {(obs.concerns_flagged?.length ?? 0) > 0 && (
            <div className="pt-1">
              <p className="text-slate-600">
                <span className="font-bold text-slate-700">Concerns flagged:</span>{" "}
                {obs.concerns_flagged.join(" — ")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
