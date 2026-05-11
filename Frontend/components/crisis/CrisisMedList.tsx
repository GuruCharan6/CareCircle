import type { CrisisMedicationItem } from "@/lib/types";

interface Props {
  medications: CrisisMedicationItem[];
  allergies: string[];
  bloodType: string | null;
  activeAlerts: string[];
}

export function CrisisMedList({ medications, allergies, bloodType, activeAlerts }: Props) {
  return (
    <div className="space-y-3">
      {/* Vitals row */}
      {(bloodType || allergies.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {bloodType && (
            <Chip label="Blood type" value={bloodType} color="blue" />
          )}
          {allergies.map(a => (
            <Chip key={a} label="Allergy" value={a} color="red" />
          ))}
        </div>
      )}

      {activeAlerts.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-1.5">
            Active Alerts
          </h4>
          <div className="space-y-1">
            {activeAlerts.map((alert, i) => (
              <div key={i} className="text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded-lg border border-red-100 flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>{alert}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {medications.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">
            Critical Medications
          </h4>
          <div className="space-y-1.5">
            {medications.map((med, i) => (
              <div
                key={i}
                className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 border ${
                  med.is_active 
                    ? "bg-white border-[var(--color-border)]" 
                    : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">
                    {med.generic}
                    {med.brand && (
                      <span className="text-[var(--color-muted)] font-normal"> ({med.brand})</span>
                    )}
                    {!med.is_active && (
                      <span className="ml-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Past</span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {[med.dose, med.frequency, med.timing].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: "blue" | "red" }) {
  const cls =
    color === "red"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${cls}`}>
      {label}: {value}
    </span>
  );
}
