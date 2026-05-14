"use client";

import type { CaregiverResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

interface Props {
  caregiver: CaregiverResponse;
  onRemove: (cg: CaregiverResponse) => void;
  onReinvite: (cg: CaregiverResponse) => void;
  onEdit: () => void;
}

export function CaregiverCard({ caregiver, onRemove, onReinvite, onEdit }: Props) {
  const initials = caregiver.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const scheduleDays = caregiver.visit_schedule.length
    ? caregiver.visit_schedule.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(", ")
    : null;

  const timeRange =
    caregiver.visit_start_time && caregiver.visit_end_time
      ? `${caregiver.visit_start_time} – ${caregiver.visit_end_time}`
      : null;

  const isPending = caregiver.invitation_status === "pending";

  return (
    <Card padding="none" className="flex flex-col">
      <div className="p-5 flex flex-col gap-4">
        {/* Identity row */}
        <div className="flex items-start gap-3">
          {/* Avatar — 44px */}
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 bg-[var(--color-primary)]">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-[var(--color-text)] leading-tight">{caregiver.name}</h3>
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                isPending
                  ? "bg-[var(--color-watch)]/10 text-[var(--color-watch)] border-[var(--color-watch)]/25"
                  : "bg-[var(--color-ok)]/10 text-[var(--color-ok)] border-[var(--color-ok)]/25"
              )}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {caregiver.invitation_status.toUpperCase()}
              </span>
            </div>
            {caregiver.phone_number && (
              <p className="text-sm text-[var(--color-muted)] mt-0.5">{caregiver.phone_number}</p>
            )}
          </div>
        </div>

        {/* Visit schedule */}
        <div>
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide font-medium mb-1">Visit Schedule</p>
          <p className="text-sm text-[var(--color-text)] font-medium">
            {scheduleDays ?? <span className="italic text-[var(--color-muted)]">No schedule set</span>}
          </p>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">
            {timeRange ?? <span className="italic">Time not set</span>}
          </p>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border)]">
          <button
            onClick={onEdit}
            className="flex-1 h-9 rounded-lg border border-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onReinvite(caregiver)}
            className="flex-1 h-9 rounded-lg border border-[var(--color-border)] text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            {isPending ? "Resend Invite" : "Reinvite"}
          </button>
          <button
            onClick={() => onRemove(caregiver)}
            className="flex-1 h-9 rounded-lg text-sm font-semibold text-[var(--color-alert)] hover:bg-[var(--color-alert)]/5 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </Card>
  );
}
