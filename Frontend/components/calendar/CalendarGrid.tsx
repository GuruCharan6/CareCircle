import { EventItem } from "./EventItem";
import type { CalendarEventResponse } from "@/lib/types";
import { formatDateLocal, parseDateLocal } from "@/lib/utils";

interface CalendarGridProps {
  events: CalendarEventResponse[];
  onEventClick: (event: CalendarEventResponse) => void;
  loading?: boolean;
}

function groupByMonth(events: CalendarEventResponse[]): Map<string, CalendarEventResponse[]> {
  const map = new Map<string, CalendarEventResponse[]>();
  const sorted = [...events].sort(
    (a, b) => a.event_date.localeCompare(b.event_date)
  );
  for (const e of sorted) {
    const key = parseDateLocal(e.event_date).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return map;
}

export function CalendarGrid({ events, onEventClick, loading }: CalendarGridProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 rounded-xl bg-[var(--color-border)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="text-center py-12 text-[var(--color-muted)] text-sm">
        No upcoming events in the next 30 days.
      </div>
    );
  }

  const grouped = groupByMonth(events);
  const today = formatDateLocal(new Date());

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([month, monthEvents]) => (
        <div key={month}>
          <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">
            {month}
          </h3>
          <div className="space-y-0.5">
            {monthEvents.map(event => {
              const isToday = event.event_date === today;
              const localDate = parseDateLocal(event.event_date);
              return (
                <div key={event.id} className="flex items-center gap-3">
                  {/* Date column */}
                  <div className={`w-10 shrink-0 text-center ${isToday ? "text-[var(--color-action)]" : "text-[var(--color-muted)]"}`}>
                    <p className="text-lg font-bold leading-none">
                      {localDate.getDate()}
                    </p>
                    <p className="text-[10px] uppercase">
                      {localDate.toLocaleDateString("en-IN", { weekday: "short" })}
                    </p>
                  </div>
                  {/* Event */}
                  <div className="flex-1 min-w-0">
                    <EventItem event={event} onClick={onEventClick} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
