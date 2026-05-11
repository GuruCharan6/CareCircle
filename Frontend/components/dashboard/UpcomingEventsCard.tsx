"use client";

import { Card } from "@/components/ui/Card";
import { useCalendar } from "@/hooks/useCalendar";
import { useEffect } from "react";
import { CalendarDays, ChevronRight, Clock, MapPin, Trash2, Edit3 } from "lucide-react";
import Link from "next/link";
import { cn, formatDateLocal, parseDateLocal } from "@/lib/utils";

export function UpcomingEventsCard({ patientId }: { patientId: string }) {
  const { events, fetch, remove, loading } = useCalendar();

  useEffect(() => {
    fetch(patientId, 30);
  }, [patientId, fetch]);

  const today = formatDateLocal(new Date());
  const filtered = events
    .filter(e => e.event_date >= today && e.status !== "cancelled")
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  // Group lab tests on the same date into one display row; keep other events as-is.
  type DisplayRow =
    | { kind: "single"; event: typeof filtered[0] }
    | { kind: "lab_group"; date: string; names: string[]; ids: string[] };

  const rows: DisplayRow[] = [];
  const labsByDate = new Map<string, typeof filtered>();
  for (const e of filtered) {
    if (e.event_type === "lab_test") {
      const bucket = labsByDate.get(e.event_date) ?? [];
      bucket.push(e);
      labsByDate.set(e.event_date, bucket);
    } else {
      rows.push({ kind: "single", event: e });
    }
  }
  for (const [date, labs] of labsByDate) {
    rows.push({
      kind: "lab_group",
      date,
      names: labs.map(e => e.title.replace(/^Lab Test:\s*/i, "")),
      ids: labs.map(e => e.id),
    });
  }
  // Re-sort combined rows by date, take first 4
  const upcoming = rows
    .sort((a, b) => {
      const da = a.kind === "single" ? a.event.event_date : a.date;
      const db = b.kind === "single" ? b.event.event_date : b.date;
      return da < db ? -1 : da > db ? 1 : 0;
    })
    .slice(0, 4);

  return (
    <Card
      title="Upcoming Events"
      icon={<CalendarDays size={18} className="text-[var(--color-action)]" />}
      headerAction={
        <Link href="/calendar" className="text-[10px] font-bold text-[var(--color-action)] uppercase flex items-center gap-1 hover:underline">
          View All <ChevronRight size={12} />
        </Link>
      }
    >
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-[var(--color-border)] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="py-8 text-center bg-[var(--color-bg)]/30 rounded-2xl border border-dashed border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-muted)] font-medium">No upcoming events scheduled.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcoming.map(row => {
              if (row.kind === "lab_group") {
                return (
                  <div key={`lab-${row.date}`} className="flex items-start gap-3 p-3 rounded-2xl border border-[var(--color-border)] bg-white">
                    <div className="p-2.5 rounded-xl shrink-0 bg-yellow-50 text-yellow-600">
                      <Clock size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--color-text)]">
                        Lab Test{row.names.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-[11px] text-[var(--color-muted)] font-medium mt-0.5">
                        {parseDateLocal(row.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                      <p className="text-[11px] text-[var(--color-text)]/70 mt-1 leading-relaxed">
                        {row.names.join(", ")}
                      </p>
                    </div>
                  </div>
                );
              }

              const event = row.event;
              return (
                <div key={event.id} className="group flex items-center gap-3 p-3 rounded-2xl border border-[var(--color-border)] bg-white hover:border-[var(--color-action)]/30 transition-all hover:shadow-sm">
                  <div className={cn(
                    "p-2.5 rounded-xl shrink-0",
                    event.event_type === "appointment" ? "bg-blue-50 text-blue-600" :
                      "bg-gray-50 text-gray-600"
                  )}>
                    <Clock size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text)] truncate">{event.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-[11px] text-[var(--color-muted)] font-medium">
                        {parseDateLocal(event.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                      {event.location && (
                        <div className="flex items-center gap-1 text-[11px] text-[var(--color-muted)]">
                          <MapPin size={10} />
                          <span className="truncate max-w-[100px]">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (confirm("Delete this schedule?")) remove(patientId, event.id);
                      }}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
