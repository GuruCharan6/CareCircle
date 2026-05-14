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
      className="rounded-2xl p-4 lg:p-6 text-white overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, #0D3B6E 0%, #1a5499 100%)" }}
    >
      {/* Header — single row, avatar + name left, status + button right */}
      <div className="flex items-center justify-between gap-3">
        {/* Avatar + identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-base lg:text-xl font-bold text-white">{initials(patient.name)}</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-base lg:text-2xl font-bold text-white leading-tight truncate">{patient.name}</h2>
            <p className="text-xs text-white/70 mt-0.5 capitalize truncate">
              {age} yrs · {patient.gender}{patient.blood_type ? ` · Blood type ${patient.blood_type}` : ""}
            </p>
          </div>
        </div>

        {/* Status badge + Emergency button */}
        <div className="flex items-center gap-2 shrink-0">
          {status && (() => {
            const statusColors: Record<string, string> = {
              ok: "#639922",
              watch: "#EF9F27",
              alert: "#E24B4A",
            };
            const statusColor = statusColors[status.toLowerCase()] || "#EF9F27";
            return (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/25 text-xs font-semibold text-white">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
                <span className="hidden sm:inline">{status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}</span>
              </div>
            );
          })()}
          {onEmergencyClick && (
            <button
              onClick={onEmergencyClick}
              disabled={emergencyLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E24B4A] hover:bg-opacity-90 text-white text-xs font-bold transition-colors disabled:opacity-60 shadow-lg"
            >
              <Download size={13} />
              {emergencyLoading ? "Generating…" : "Emergency Card"}
            </button>
          )}
        </div>
      </div>

      {/* Condition + allergy pills */}
      {(patient.known_conditions?.length > 0 || patient.known_allergies?.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
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
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/20">
        <StatItem
          label="PRIMARY DOCTOR"
          value={patient.primary_physician?.name ?? "—"}
          sub={patient.primary_city ?? undefined}
        />
        <StatItem
          label="LAST UPDATED"
          value={patientState ? new Date(patientState.computed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
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
    <div className="min-w-0">
      <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-0.5 truncate">{label}</p>
      <p className="text-xs font-bold text-white truncate">{value}</p>
      {sub && <p className="text-[10px] text-white/60 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}
