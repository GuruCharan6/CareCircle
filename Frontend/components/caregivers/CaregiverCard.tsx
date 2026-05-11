"use client";

import { RefreshCw, Trash2, Edit2, Dot } from "lucide-react";
import type { CaregiverResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
    : "No schedule set";

  const timeRange =
    caregiver.visit_start_time && caregiver.visit_end_time
      ? `${caregiver.visit_start_time} – ${caregiver.visit_end_time}`
      : "Time not set";

  const isPending = caregiver.invitation_status === "pending";

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-5 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0",
            isPending ? "bg-[#EF9F27]" : "bg-[#1D9E75]"
          )}>
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-[var(--color-text)] text-base leading-tight truncate">{caregiver.name}</h3>
            <p className="text-[13px] font-bold text-[var(--color-muted)] mt-0.5">{caregiver.phone_number}</p>
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest border w-fit mt-1.5",
              isPending 
                ? "bg-[#EF9F27]/10 text-[#EF9F27] border-[#EF9F27]/20" 
                : "bg-[#639922]/10 text-[#639922] border-[#639922]/20"
            )}>
              <div className="w-1.5 h-1.5 rounded-full bg-current" />
              {caregiver.invitation_status.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest mb-1">Visit Schedule</p>
          <p className="text-[14px] font-bold text-[var(--color-text)] leading-tight">{scheduleDays}</p>
          <p className="text-[12px] font-bold text-[var(--color-muted)] mt-0.5">{timeRange}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-[var(--color-border)]">
        <button
          onClick={onEdit}
          className="px-4 py-1.5 rounded-lg border border-[var(--color-border)] text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-bg)] transition-colors"
        >
          Edit
        </button>
        
        <button 
          onClick={() => onReinvite(caregiver)}
          className="text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors"
        >
          {isPending ? "Resend Invite" : "Reinvite"}
        </button>

        <button 
          onClick={() => onRemove(caregiver)}
          className="ml-auto text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-alert)] transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
