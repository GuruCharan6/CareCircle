import type { CrisisPrescriberItem } from "@/lib/types";
import { Stethoscope, Phone } from "lucide-react";

interface Props {
  doctors: CrisisPrescriberItem[];
}

export function CrisisDoctorList({ doctors }: Props) {
  if (!doctors || doctors.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">
        Doctors & Specialists
      </h4>
      <div className="space-y-1.5">
        {doctors.map((doc, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-[var(--color-border)] shadow-sm"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-text)] truncate">
                {doc.name}
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                {[doc.specialty, doc.hospital].filter(Boolean).join(" · ")}
              </p>
            </div>
            {doc.phone && (
              <a
                href={`tel:${doc.phone}`}
                className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-primary)] hover:bg-[var(--color-action)]/10 transition-colors shrink-0"
              >
                <Phone size={14} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
