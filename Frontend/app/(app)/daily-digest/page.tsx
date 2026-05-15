"use client";

import { useEffect, useMemo } from "react";
import { usePatient } from "@/hooks/usePatient";
import { useDigest } from "@/hooks/useDigest";
import { DigestCard } from "@/components/dashboard/DigestCard";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, RefreshCw, TriangleAlert, Lightbulb, AlertCircle, MessageCircle } from "lucide-react";
import type { DigestRecentObservation } from "@/lib/types";
import Link from "next/link";

function currentPeriod(): "morning" | "evening" {
  const h = new Date().getHours();
  return h >= 5 && h < 12 ? "morning" : "evening";
}

export default function DailyDigestPage() {
  const { activePatient, loading: patientLoading } = usePatient();
  const { digest, fetch: fetchDigest, loading: digestLoading } = useDigest();
  const period = useMemo(() => currentPeriod(), []);

  useEffect(() => {
    if (activePatient) {
      fetchDigest(activePatient.id, period);
    }
  }, [activePatient, period, fetchDigest]);

  if (patientLoading) {
    return (
      <div className="max-w-6xl mx-auto animate-pulse pb-12">
        <div className="h-64 bg-[var(--color-border)] rounded-2xl" />
      </div>
    );
  }

  if (!activePatient) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-[var(--color-muted)]">No active patient selected.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="secondary" size="icon" className="rounded-full">
              <ChevronLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-primary)]">Daily Digest</h1>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => fetchDigest(activePatient.id, period)}
          disabled={digestLoading}
          className="gap-2"
        >
          <RefreshCw size={14} className={digestLoading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <DigestCard digest={digest} loading={digestLoading} />
        
        {digest && !digestLoading && (
          <div className="p-4 lg:p-8 space-y-8">

            {/* Needs Action — urgent alert */}
            {digest.needs_action && (
              <div className="flex gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Action Required</p>
                  <p className="text-red-900 font-medium leading-relaxed">{digest.needs_action}</p>
                </div>
              </div>
            )}

            {/* Drug Interactions */}
            {digest.drug_interactions && digest.drug_interactions.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-widest mb-4">Drug Interactions</h2>
                <div className="space-y-3">
                  {digest.drug_interactions.map((ix, i) => (
                    <div key={i} className={`flex gap-3 p-4 rounded-xl border ${ix.urgency === "alert" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-100"}`}>
                      <TriangleAlert size={16} className={`shrink-0 mt-0.5 ${ix.urgency === "alert" ? "text-red-500" : "text-amber-500"}`} />
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${ix.urgency === "alert" ? "text-red-500" : "text-amber-600"}`}>
                          {ix.severity ?? ix.urgency}
                        </p>
                        <p className="font-semibold text-[var(--color-text)]">{ix.drug_a} + {ix.drug_b}</p>
                        {ix.note && <p className="text-sm text-[var(--color-muted)] mt-1">{ix.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Known Facts */}
            {digest.known_facts && digest.known_facts.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-widest mb-4">Confirmed Facts</h2>
                <div className="space-y-3">
                  {digest.known_facts.map((fact, i) => (
                    <div key={i} className="flex gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                      <p className="text-[var(--color-text)] leading-relaxed">{fact}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Hypotheses */}
            {digest.hypotheses && digest.hypotheses.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-widest mb-4">Clinical Observations</h2>
                <div className="space-y-3">
                  {digest.hypotheses.map((hyp, i) => (
                    <div key={i} className="flex gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
                      <Lightbulb size={16} className="text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-[var(--color-text)] leading-relaxed">{hyp}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Caregiver Updates */}
            {digest.recent_observations && digest.recent_observations.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-widest mb-4">Caregiver Updates</h2>
                <div className="space-y-3">
                  {digest.recent_observations.map((obs: DigestRecentObservation, i: number) => {
                    const hasConcern = obs.concerns_flagged.length > 0 || obs.symptoms_reported.length > 0;
                    const who = obs.caregiver_name ?? (obs.source_type === "voice_log" ? "Meera" : "Caregiver");
                    const when = obs.created_at
                      ? new Date(obs.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                      : obs.observation_date;
                    return (
                      <div
                        key={i}
                        className={`flex gap-3 p-4 rounded-xl border ${hasConcern ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100"}`}
                      >
                        <MessageCircle size={16} className={`shrink-0 mt-0.5 ${hasConcern ? "text-amber-500" : "text-slate-400"}`} />
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-[var(--color-muted)]">{who} · {when}</p>
                          <p className="text-[var(--color-text)] leading-relaxed">{obs.summary ?? "Checked in"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Upcoming Events */}
            {digest.upcoming_events && digest.upcoming_events.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-widest mb-4">Upcoming Events</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {digest.upcoming_events.map((event, i) => (
                    <div key={i} className="p-4 rounded-xl border border-[var(--color-border)] flex flex-col gap-1">
                      <p className="text-xs font-bold text-[var(--color-alert)] uppercase">
                        {event.days_until === 0 ? "Today" : `In ${event.days_until} days`}
                      </p>
                      <p className="font-semibold text-[var(--color-text)]">{event.title}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Refill Reminders */}
            {digest.refill_alerts && digest.refill_alerts.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-widest mb-4">Refill Reminders</h2>
                <div className="space-y-3">
                  {digest.refill_alerts.map((refill, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-100">
                      <div>
                        <p className="font-bold text-amber-900">{refill.brand_name || refill.generic_name}</p>
                        <p className="text-sm text-amber-700">Refill due in {refill.days_remaining} days</p>
                      </div>
                      <Link href="/refills">
                        <Button size="sm" variant="secondary" className="bg-white hover:bg-amber-100 text-amber-900 border-amber-200">
                          Manage
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
