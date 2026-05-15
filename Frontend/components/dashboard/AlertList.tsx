import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { AlertTriangle, ArrowRight, Pill, Siren, CalendarClock, Info, ChevronRight, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { calendarApi } from "@/lib/api/calendar";
import { Button } from "@/components/ui/Button";

interface AlertListProps {
  patientId: string;
  interactions: any[];
  refills: any[];
  emergencyFollowUps?: any[];
  suggestedAppointments?: any[];
  gapActions?: string[];
  onActionComplete?: () => void;
  onEmergencyFollowUp?: (notifId: string) => void;
}

const SEVERITY_STYLE: Record<string, { badge: string; border: string; icon: string }> = {
  contraindicated: { badge: "bg-red-100 text-red-700", border: "border-l-red-500", icon: "text-red-500" },
  major:           { badge: "bg-orange-100 text-orange-700", border: "border-l-orange-500", icon: "text-orange-500" },
  moderate:        { badge: "bg-yellow-100 text-yellow-700", border: "border-l-yellow-500", icon: "text-yellow-500" },
  minor:           { badge: "bg-blue-100 text-blue-700", border: "border-l-blue-400", icon: "text-blue-400" },
  low:             { badge: "bg-gray-100 text-gray-500", border: "border-l-gray-300", icon: "text-gray-400" },
  alert:           { badge: "bg-red-100 text-red-700", border: "border-l-red-500", icon: "text-red-500" },
  watch:           { badge: "bg-yellow-100 text-yellow-700", border: "border-l-yellow-500", icon: "text-yellow-500" },
  inform:          { badge: "bg-blue-100 text-blue-700", border: "border-l-blue-400", icon: "text-blue-400" },
};

const URGENCY_STYLE: Record<string, { badge: string; border: string }> = {
  alert:    { badge: "bg-red-100 text-red-700", border: "border-l-red-500" },
  watch:    { badge: "bg-amber-100 text-amber-700", border: "border-l-amber-500" },
  ok:       { badge: "bg-green-100 text-green-700", border: "border-l-green-400" },
};

export function AlertList({ 
  patientId,
  interactions, 
  refills, 
  emergencyFollowUps = [], 
  suggestedAppointments = [],
  gapActions = [],
  onActionComplete,
  onEmergencyFollowUp
}: AlertListProps) {
  const router = useRouter();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const totalItems =
    interactions.length +
    refills.length +
    emergencyFollowUps.length +
    suggestedAppointments.length +
    gapActions.length;

  if (totalItems === 0) return null;

  const handleConfirmAppointment = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActioningId(eventId);
    try {
      await calendarApi.confirm(patientId, eventId);
      onActionComplete?.();
    } catch (err) {
      console.error("Failed to confirm appointment:", err);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <Card className="border-0 shadow-lg overflow-hidden bg-white/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-50 text-rose-500">
            <AlertTriangle size={18} fill="currentColor" fillOpacity={0.1} />
          </div>
          <CardTitle className="text-[16px] font-bold text-[#0D3B6E]">Needs Attention</CardTitle>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-600 shadow-sm">{totalItems}</span>
        </div>
      </CardHeader>

      <div className="space-y-3 px-4 lg:px-6 pb-4 lg:pb-6 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
        {/* EMERGENCY FOLLOW-UPS */}
        {emergencyFollowUps.map((e) => (
          <div
            key={e.id}
            onClick={() => onEmergencyFollowUp?.(e.id)}
            className="group flex items-start gap-4 rounded-2xl bg-rose-50/50 border border-rose-100 border-l-4 border-l-rose-500 p-4 shadow-sm cursor-pointer hover:bg-rose-50 transition-colors"
          >
            <div className="p-2.5 rounded-xl bg-white text-rose-500 shadow-sm group-hover:scale-110 transition-transform">
              <Siren size={20} />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-[14px] font-bold text-rose-900">Emergency Follow-up</h4>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500 text-white uppercase tracking-wider">Urgent</span>
              </div>
              <p className="text-[12px] text-rose-700 leading-relaxed font-medium">
                {e.body}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 mt-2">
                Click to add note <ChevronRight size={14} />
              </div>
            </div>
          </div>
        ))}

        {/* DRUG INTERACTIONS */}
        {interactions.map((i) => {
          const sev = (i.severity || i.final_urgency || "low").toLowerCase();
          const style = SEVERITY_STYLE[sev] ?? SEVERITY_STYLE.low;
          return (
            <div
              key={i.id}
              onClick={() => router.push('/drug-interactions')}
              className={`group flex items-start gap-4 rounded-2xl bg-white border border-slate-100 border-l-4 ${style.border} p-4 shadow-sm cursor-pointer hover:border-slate-200 transition-all`}
            >
              <div className={`p-2.5 rounded-xl bg-slate-50 shrink-0 group-hover:bg-white transition-colors`}>
                <AlertTriangle size={20} className={style.icon} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="text-[13px] font-bold text-[#0D3B6E]">
                  {i.drug_a_generic} + {i.drug_b_generic}
                </h4>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 mt-1">
                  Review Interaction <ChevronRight size={14} />
                </div>
              </div>
            </div>
          );
        })}

        {/* REFILL ALERTS */}
        {refills.map((r) => {
          const urg = (r.urgency || "ok").toLowerCase();
          const style = URGENCY_STYLE[urg] ?? URGENCY_STYLE.ok;
          return (
            <div
              key={r.medication_id}
              onClick={() => router.push('/refills')}
              className={`group flex items-start gap-4 rounded-2xl bg-white border border-slate-100 border-l-4 ${style.border} p-4 shadow-sm cursor-pointer hover:border-slate-200 transition-all`}
            >
              <div className="p-2.5 rounded-xl bg-amber-50 shrink-0 text-amber-500 group-hover:bg-white transition-colors">
                <Pill size={20} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[13px] font-bold text-[#0D3B6E]">
                    {r.generic_name} — refill in {r.days_remaining}d
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${style.badge}`}>
                    {urg}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 mt-1">
                  Manage Refill <ChevronRight size={14} />
                </div>
              </div>
            </div>
          );
        })}

        {/* SUGGESTED APPOINTMENTS */}
        {suggestedAppointments.map((a) => (
          <div
            key={a.id}
            className="group flex items-start gap-4 rounded-2xl bg-white border border-slate-100 border-l-4 border-l-blue-500 p-4 shadow-sm"
          >
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
              <CalendarClock size={20} />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-bold text-[#0D3B6E]">{a.title}</h4>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-600 uppercase tracking-wider">Suggested</span>
              </div>
              <p className="text-[12px] text-slate-500 leading-relaxed font-medium">
                Appointment suggested for {new Date(a.event_date).toLocaleDateString()}.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <Button 
                  size="sm" 
                  className="h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 gap-1.5 shadow-sm transition-all active:scale-95"
                  onClick={(e) => handleConfirmAppointment(a.id, e)}
                  loading={actioningId === a.id}
                >
                  <Check size={14} />
                  Confirm Schedule
                </Button>
                <button 
                  onClick={() => router.push('/calendar')}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* CARE GAPS */}
        {gapActions.map((g, idx) => (
          <div
            key={`gap-${idx}`}
            onClick={() => router.push('/calendar')}
            className="group flex items-start gap-4 rounded-2xl bg-slate-50/50 border border-slate-100 border-l-4 border-l-slate-400 p-4 shadow-sm cursor-pointer hover:bg-white hover:border-slate-200 transition-all"
          >
            <div className="p-2.5 rounded-xl bg-white text-slate-400 shadow-sm group-hover:scale-110 transition-transform">
              <Info size={20} />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="text-[13px] font-bold text-slate-700">Preventive Care Gap</h4>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                {g}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mt-1.5">
                View in Calendar <ChevronRight size={14} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
