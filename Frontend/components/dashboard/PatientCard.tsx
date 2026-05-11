import { PatientStateBadge } from "./PatientStateBadge";
import { AlertTriangle, Download } from "lucide-react";
import type { PatientResponse, PatientStateResponse } from "@/lib/types";

function calcAge(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function initials(name: string): string {
  return name
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface PatientCardProps {
  patient: PatientResponse;
  patientState: PatientStateResponse | null;
  onEmergencyClick?: () => void;
  emergencyLoading?: boolean;
}

export function PatientCard({ patient, patientState, onEmergencyClick, emergencyLoading }: PatientCardProps) {
  const age = calcAge(patient.date_of_birth);
  const status = (patientState as any)?.overall_status ?? (patientState as any)?.status ?? null;

  return (
    <div
      className="rounded-2xl p-6 text-white overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, #0D3B6E 0%, #1a5499 100%)" }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        {/* Avatar + identity */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-white">{initials(patient.name)}</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white leading-tight">{patient.name}</h2>
            <p className="text-sm text-white/70 mt-0.5 capitalize">
              {age} yrs · {patient.gender}{patient.blood_type ? ` · Blood type ${patient.blood_type}` : ""}
            </p>
          </div>
        </div>

        {/* Status + Emergency button */}
        <div className="flex items-center gap-3 shrink-0">
          {status && (() => {
            const statusColors: Record<string, string> = {
              ok: "#639922",
              watch: "#EF9F27",
              alert: "#E24B4A",
            };
            const statusColor = statusColors[status.toLowerCase()] || "#EF9F27";
            return (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/25 text-sm font-semibold text-white">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
              </div>
            );
          })()}
          {onEmergencyClick && (
            <button
              onClick={onEmergencyClick}
              disabled={emergencyLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E24B4A] hover:bg-opacity-90 text-white text-sm font-bold transition-colors disabled:opacity-60 shadow-lg"
            >
              <Download size={15} />
              {emergencyLoading ? "Generating…" : "Emergency Card"}
            </button>
          )}
        </div>
      </div>

      {/* Condition + allergy pills */}
      {(patient.known_conditions?.length > 0 || patient.known_allergies?.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-4">
          {patient.known_conditions?.map((c, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/15 border border-white/20 text-white"
            >
              {c}
            </span>
          ))}
          {patient.known_allergies?.map((a, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#E24B4A]/30 border border-[#E24B4A]/50 text-white flex items-center gap-1"
            >
              <AlertTriangle size={11} />
              {a} allergy
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/20">
        <StatItem
          label="PRIMARY DOCTOR"
          value={patient.primary_physician?.name ?? "—"}
          sub={patient.primary_city ?? undefined}
        />
        <StatItem
          label="LAST UPDATED"
          value={patientState ? new Date(patientState.computed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
          sub="State computed"
        />
        <StatItem
          label="MEDICATIONS"
          value={patientState ? `${patientState.active_medication_count} active` : "—"}
          sub={patientState?.active_alerts_count ? `${patientState.active_alerts_count} alert${patientState.active_alerts_count !== 1 ? "s" : ""}` : undefined}
        />
      </div>
    </div>
  );
}

function StatItem({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/60 mt-0.5">{sub}</p>}
    </div>
  );
}
