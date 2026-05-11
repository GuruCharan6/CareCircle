import { CalendarDays, Stethoscope, FlaskConical, Pill, RefreshCw, ChevronRight, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { CalendarEventResponse, EventType, EventStatus } from "@/lib/types";

const TYPE_ICON: Record<EventType, any> = {
  appointment:          Stethoscope,
  followup:             Stethoscope,
  caregiver_visit:      UserPlus,
  prescription_refill:  Pill,
  lab_test:             FlaskConical,
  medication_review:    RefreshCw,
};

const STATUS_VARIANT: Record<EventStatus, "muted" | "watch" | "ok" | "primary"> = {
  suggested:  "watch",
  confirmed:  "ok",
  completed:  "muted",
  cancelled:  "muted",
};

interface EventItemProps {
  event: CalendarEventResponse;
  onClick: (event: CalendarEventResponse) => void;
}

export function EventItem({ event, onClick }: EventItemProps) {
  const Icon = TYPE_ICON[event.event_type];

  return (
    <button
      onClick={() => onClick(event)}
      className="w-full flex items-center gap-3 py-2.5 hover:bg-[var(--color-surface)] rounded-lg px-2 -mx-2 transition-colors text-left group"
    >
      <span className="p-2 rounded-lg bg-[var(--color-surface)] group-hover:bg-white shrink-0">
        <Icon size={14} className="text-[var(--color-action)]" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)] truncate">{event.title}</p>
        <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] mt-0.5">
          {event.event_time && <span>{event.event_time}</span>}
          {event.location && <span>· {event.location}</span>}
          {event.specialist_type && <span>· {event.specialist_type}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={STATUS_VARIANT[event.status]} className="text-[10px]">
          {event.status}
        </Badge>
        <ChevronRight size={14} className="text-[var(--color-muted)] group-hover:text-[var(--color-action)] transition-colors" />
      </div>
    </button>
  );
}
