"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePatient } from "@/hooks/usePatient";
import { usePatientState } from "@/hooks/usePatientState";
import { useDigest } from "@/hooks/useDigest";
import { useMedications } from "@/hooks/useMedications";
import { PatientCard } from "@/components/dashboard/PatientCard";
import { FreshnessBar } from "@/components/dashboard/FreshnessBar";
import { AlertList } from "@/components/dashboard/AlertList";
import { DigestCard } from "@/components/dashboard/DigestCard";
import { MedicationQuickList } from "@/components/dashboard/MedicationQuickList";
import { LabSummaryRow } from "@/components/dashboard/LabSummaryRow";
import { Button } from "@/components/ui/Button";
import { CrisisModal } from "@/components/crisis/CrisisModal";
import { CrisisFollowUpModal } from "@/components/crisis/CrisisFollowUpModal";
import { Circle, Pill, CalendarDays } from "lucide-react";
import { crisisApi } from "@/lib/api/crisis";
import { cn } from "@/lib/utils";

function currentPeriod(): "morning" | "evening" {
  const h = new Date().getHours();
  return h >= 5 && h < 12 ? "morning" : "evening";
}

export default function DashboardPage() {
  const { activePatient, loading: patientLoading, error: patientError, fetchPatients } = usePatient();
  const { state: patientState, fetch: fetchState, loading: stateLoading } = usePatientState();
  const { digest, fetch: fetchDigest, loading: digestLoading } = useDigest();
  const { medications, fetch: fetchMeds, loading: medsLoading } = useMedications();

  const [crisisOpen, setCrisisOpen] = useState(false);
  const [followUpNotifId, setFollowUpNotifId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const period = useMemo(() => currentPeriod(), []);

  async function handleDownloadBriefing() {
    if (!activePatient) return;
    setDownloading(true);
    try {
      const { signed_url: url } = await crisisApi.getPdf(activePatient.id);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `emergency-card-${activePatient.name.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e: any) {
      console.error("PDF Download Error:", e);
      if (e.status === 404) {
        alert("Patient records not found. Please refresh the page.");
      } else {
        alert(e.message || "Failed to generate emergency card. Please try again.");
      }
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    if (!activePatient) return;
    fetchState(activePatient.id);
    fetchDigest(activePatient.id, period);
    fetchMeds(activePatient.id);
  }, [activePatient?.id, period, fetchState, fetchDigest, fetchMeds]);

  if (patientLoading) {
    return (
      <div className="space-y-5 max-w-6xl mx-auto pb-12 animate-pulse">
        <div className="h-52 bg-[var(--color-border)] rounded-2xl" />
        <div className="h-40 bg-[var(--color-border)] rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-[var(--color-border)] rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!activePatient) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        {patientError ? (
          <>
            <p className="text-[var(--color-alert)] text-sm font-medium">Failed to load patient data</p>
            <p className="text-[var(--color-muted)] text-xs max-w-sm text-center">{patientError}</p>
            <Button variant="secondary" onClick={fetchPatients}>Retry</Button>
          </>
        ) : (
          <p className="text-[var(--color-muted)] text-sm">No patient found. Complete onboarding first.</p>
        )}
      </div>
    );
  }

  const nextAppts = (patientState as any)?.upcoming_appointments || [];
  const upcomingAppt = nextAppts[0];
  const overallStatusValue = (patientState as any)?.overall_status ?? (patientState as any)?.status ?? "—";
  const statusColors: Record<string, string> = {
    ok: "#639922",
    watch: "#EF9F27",
    alert: "#E24B4A",
  };
  const statusColor = statusColors[overallStatusValue.toLowerCase()] || "#EF9F27";

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">

      <PatientCard
        patient={activePatient}
        patientState={!stateLoading ? patientState : null}
        onEmergencyClick={handleDownloadBriefing}
        emergencyLoading={downloading}
      />

      <CrisisModal
        open={crisisOpen}
        patientId={activePatient.id}
        onClose={() => setCrisisOpen(false)}
        onExited={() => fetchState(activePatient.id)}
      />

      <CrisisFollowUpModal
        open={!!followUpNotifId}
        patientId={activePatient.id}
        notificationId={followUpNotifId || ""}
        onClose={() => { setFollowUpNotifId(null); fetchState(activePatient.id); }}
      />

      <DigestCard digest={digest} loading={digestLoading} />

      {patientState && !stateLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div
            onClick={() => document.getElementById('needs-attention')?.scrollIntoView({ behavior: 'smooth' })}
            className="cursor-pointer transition-all active:scale-95 hover:translate-y-[-2px]"
          >
            <StatCard
              label="OVERALL STATUS"
              value={overallStatusValue.charAt(0).toUpperCase() + overallStatusValue.slice(1).toLowerCase()}
              sub={`${(patientState.active_alerts_count || 0) + (patientState.active_watch_count || 0)} items need attention`}
              icon={<Circle size={18} style={{ color: statusColor }} />}
              topColor={statusColor}
            />
          </div>

          <Link href="/medications" className="block transition-all active:scale-95 hover:translate-y-[-2px]">
            <StatCard
              label="ACTIVE MEDICATIONS"
              value={String(patientState.active_medication_count)}
              sub="All verified · tracked"
              icon={<Pill size={18} className="text-[#1D9E75]" />}
              topColor="#1D9E75"
            />
          </Link>

          <Link href="/calendar" className="block transition-all active:scale-95 hover:translate-y-[-2px]">
            <StatCard
              label="SCHEDULED EVENTS"
              value={
                upcomingAppt
                  ? new Date((upcomingAppt as any).event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                  : "—"
              }
              sub={(() => {
                if (nextAppts.length === 0) return "No upcoming appointments";
                const labTests = nextAppts.filter((a: any) => a.event_type === "lab_test");
                const others = nextAppts.filter((a: any) => a.event_type !== "lab_test");
                const parts: string[] = [
                  ...others.map((a: any) => a.title),
                  ...(labTests.length > 0
                    ? [`Lab Tests: ${labTests.map((a: any) => (a.title as string).replace(/^Lab Test:\s*/i, "")).join(", ")}`]
                    : []),
                ];
                return parts.join(" · ");
              })()}
              icon={<CalendarDays size={18} className="text-[#0D3B6E]" />}
              topColor="#0D3B6E"
            />
          </Link>
        </div>
      )}

      {patientState && !stateLoading && (
        <FreshnessBar
          score={patientState.freshness_score}
          computedAt={patientState.computed_at}
          indicators={patientState.staleness_indicators}
        />
      )}

      {patientState && !stateLoading && (() => {
        const SEVERITY_ORDER: Record<string, number> = {
          contraindicated: 0, major: 1, moderate: 2, minor: 3, low: 4,
          alert: 0, watch: 2, inform: 4,
        };
        const seen = new Set<string>();
        const allDeduped = patientState.drug_interactions
          .filter((ix: any) => {
            const key = [ix.drug_a_generic, ix.drug_b_generic].sort().join("||");
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort((a: any, b: any) => {
            const sa = SEVERITY_ORDER[(a.severity || a.final_urgency || "low").toLowerCase()] ?? 4;
            const sb = SEVERITY_ORDER[(b.severity || b.final_urgency || "low").toLowerCase()] ?? 4;
            return sa - sb;
          });
        const topInteractions = allDeduped;
        const sortedRefills = [...patientState.refill_alerts].sort((a: any, b: any) => a.days_remaining - b.days_remaining);

        const hasAnyAlert =
          topInteractions.length > 0 ||
          sortedRefills.length > 0 ||
          (patientState as any).emergency_follow_ups?.length > 0 ||
          (patientState as any).suggested_appointments?.length > 0 ||
          (patientState as any).gap_actions?.length > 0;

        return hasAnyAlert && (
          <div id="needs-attention" className="scroll-mt-6">
            <AlertList
              patientId={activePatient.id}
              interactions={topInteractions}
              refills={sortedRefills}
              emergencyFollowUps={(patientState as any).emergency_follow_ups}
              suggestedAppointments={(patientState as any).suggested_appointments}
              gapActions={patientState.gap_actions}
              onActionComplete={() => { setTimeout(() => fetchState(activePatient.id), 1500); }}
              onEmergencyFollowUp={(id) => setFollowUpNotifId(id)}
            />
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MedicationQuickList medications={medications} loading={medsLoading} />
        <LabSummaryRow patientId={activePatient.id} />
      </div>

    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  topColor,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  topColor: string;
}) {
  return (
    <div
      className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5 border-t-4"
      style={{ borderTopColor: topColor }}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">{label}</p>
        {icon}
      </div>
      <p className="text-2xl lg:text-4xl font-bold text-[var(--color-text)] leading-none mb-1">{value}</p>
      <p className="text-xs text-[var(--color-muted)]">{sub}</p>
    </div>
  );
}
