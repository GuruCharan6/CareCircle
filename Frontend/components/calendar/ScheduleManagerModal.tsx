"use client";

import { Modal } from "@/components/ui/Modal";
import { X, Edit3, Trash2, Calendar } from "lucide-react";
import type { CalendarEventResponse } from "@/lib/types";
import { cn, parseDateLocal } from "@/lib/utils";

interface ScheduleManagerModalProps {
  open: boolean;
  onClose: () => void;
  events: CalendarEventResponse[];
  onEdit: (event: CalendarEventResponse) => void;
  onDelete: (eventId: string) => void;
}

export function ScheduleManagerModal({ open, onClose, events, onEdit, onDelete }: ScheduleManagerModalProps) {
  const upcoming = events
    .filter(e => e.status !== "cancelled")
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  return (
    <Modal open={open} onClose={onClose} title="Manage Schedules" size="md">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
        {upcoming.length === 0 ? (
          <div className="py-12 text-center">
            <Calendar size={32} className="mx-auto text-[var(--color-border)] mb-2" />
            <p className="text-sm text-[var(--color-muted)]">No upcoming schedules found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map(event => (
              <div key={event.id} className="group flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-action)]/30 transition-all bg-[var(--color-bg)]/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-[var(--color-text)] truncate">{event.title}</p>
                    <span className={cn(
                      "text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                      event.event_type === "appointment" ? "bg-[var(--color-action)]/10 text-[var(--color-action)]" :
                      event.event_type === "lab_test" ? "bg-[var(--color-watch)]/10 text-[var(--color-watch)]" :
                      "bg-[var(--color-text)]/10 text-[var(--color-text)]"
                    )}>
                      {event.event_type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--color-muted)] font-medium mt-0.5">
                    {parseDateLocal(event.event_date).toLocaleDateString("en-IN", { weekday: 'short', day: "numeric", month: "long" })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => onEdit(event)}
                    className="p-2 hover:bg-[var(--color-action)]/10 text-[var(--color-action)] rounded-lg transition-all"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this schedule?")) {
                        onDelete(event.id);
                      }
                    }}
                    className="p-2 hover:bg-[var(--color-alert)]/10 text-[var(--color-alert)] rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
