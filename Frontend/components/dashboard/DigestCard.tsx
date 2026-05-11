"use client";

import { Sun, Moon, CheckCircle2, AlertCircle, Calendar, Circle } from "lucide-react";
import type { DigestResponse } from "@/lib/types";

interface DigestCardProps {
  digest: DigestResponse | null;
  loading?: boolean;
}

export function DigestCard({ digest, loading }: DigestCardProps) {
  if (loading) {
    return (
      <div
        className="rounded-2xl p-6 animate-pulse"
        style={{ background: "linear-gradient(135deg, #0D3B6E 0%, #1a5499 100%)" }}
      >
        <div className="h-5 w-48 rounded-full bg-white/20 mb-4" />
        <div className="h-8 w-3/4 rounded-lg bg-white/20 mb-2" />
        <div className="h-6 w-1/2 rounded-lg bg-white/20 mb-4" />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <div key={i} className="h-7 w-36 rounded-full bg-white/15" />)}
        </div>
      </div>
    );
  }

  if (!digest) return null;

  const isMorning = digest.period === "morning";
  const PeriodIcon = isMorning ? Sun : Moon;
  const dateStr = new Date(digest.generated_at).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();

  const hasRefills = Array.isArray(digest.refill_alerts) && digest.refill_alerts.length > 0;
  const hasEvents  = Array.isArray(digest.upcoming_events) && digest.upcoming_events.length > 0;

  return (
    <div
      className="rounded-2xl p-6 text-white overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0D3B6E 0%, #1a5499 100%)" }}
    >
      {/* Period label */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-xs font-bold text-white/80 uppercase tracking-wider mb-4">
        <Circle size={7} className="fill-[var(--color-action)] text-[var(--color-action)]" />
        {isMorning ? "Morning" : "Evening"} Digest · {dateStr}
      </div>

      {/* Summary */}
      {digest.today_summary ? (
        <p className="text-lg font-semibold text-white leading-snug">
          {digest.today_summary}
        </p>
      ) : digest.needs_action ? (
        <p className="text-lg font-semibold text-white leading-snug">
          {digest.needs_action}
        </p>
      ) : (
        <p className="text-lg font-semibold text-white/70 leading-snug">
          {isMorning ? "Good morning" : "Good evening"} — no new updates.
        </p>
      )}

      {/* Status pills */}
      <div className="flex flex-wrap gap-2 mt-4">
        {digest.known_facts?.length > 0 && (
          <Pill icon={<CheckCircle2 size={12} />} color="green">
            {digest.known_facts.length} item{digest.known_facts.length !== 1 ? "s" : ""} tracked
          </Pill>
        )}

        {hasRefills && digest.refill_alerts.slice(0, 2).map((r, i) => (
          <Pill key={i} icon={<AlertCircle size={12} />} color="amber">
            {r.brand_name || r.generic_name} refill in {r.days_remaining} days
          </Pill>
        ))}

        {digest.needs_action && (
          <Pill icon={<AlertCircle size={12} />} color="red">
            {digest.needs_action.length > 40
              ? digest.needs_action.slice(0, 37) + "…"
              : digest.needs_action}
          </Pill>
        )}

        {hasEvents && digest.upcoming_events.map((event, idx) => (
          <Pill key={idx} icon={<Calendar size={12} />} color="default">
            {idx === 0 ? "Next appt: " : "Followed by: "}
            {event.days_until === 0
              ? "Today"
              : `in ${event.days_until} day${event.days_until !== 1 ? "s" : ""}`}
            {" · "}{event.title}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function Pill({
  icon,
  color,
  children,
}: {
  icon: React.ReactNode;
  color: "green" | "amber" | "red" | "default";
  children: React.ReactNode;
}) {
  const cls =
    color === "green"  ? "bg-green-500/25 border-green-400/40 text-green-100" :
    color === "amber"  ? "bg-amber-500/25 border-amber-400/40 text-amber-100" :
    color === "red"    ? "bg-red-500/25 border-red-400/40 text-red-100" :
                         "bg-white/15 border-white/25 text-white/80";

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${cls}`}>
      {icon}
      {children}
    </span>
  );
}
