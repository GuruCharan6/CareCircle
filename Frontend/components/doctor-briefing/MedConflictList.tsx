import { AlertTriangle } from "lucide-react";
import type { DoctorBriefingResponse } from "@/lib/api/doctor-briefing";

type MedItem = DoctorBriefingResponse["meds_from_other_doctors"][number];

interface Props {
  meds: MedItem[];
}

export function MedConflictList({ meds }: Props) {
  if (!meds?.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[var(--color-primary)] flex items-center gap-2">
        <AlertTriangle size={16} className="text-[var(--color-watch)]" />
        Medications from Other Doctors
      </h3>
      <div className="space-y-2">
        {meds.map((m, i) => (
          <div
            key={i}
            className="bg-[var(--color-surface)] rounded-lg px-3 py-2.5 border border-[var(--color-border)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">{m.generic_name}</p>
                {m.dose && (
                  <p className="text-xs text-[var(--color-muted)]">{m.dose}</p>
                )}
              </div>
              {m.prescriber_name && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-[var(--color-muted)]">
                    Dr. {m.prescriber_name.replace(/^Dr\.?\s*/i, "")}
                  </p>
                  {m.prescriber_specialty && (
                    <p className="text-[10px] text-[var(--color-muted)]">{m.prescriber_specialty}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
