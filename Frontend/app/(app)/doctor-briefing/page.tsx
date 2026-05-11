"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarDays } from "lucide-react";
import { usePatient } from "@/hooks/usePatient";
import { useDoctorBriefing } from "@/hooks/useDoctorBriefing";
import { useCalendar } from "@/hooks/useCalendar";
import { BriefingCard } from "@/components/doctor-briefing/BriefingCard";
import { PdfDownloadBtn } from "@/components/doctor-briefing/PdfDownloadBtn";
import { PageHeader } from "@/components/ui/PageHeader";
import type { CalendarEventResponse } from "@/lib/types";

export default function DoctorBriefingPage() {
  const { activePatient } = usePatient();
  const { events, fetch: fetchEvents } = useCalendar();
  const { briefing, loading, pdfLoading, error, fetchBriefing, openBriefingPdf, openMedListPdf } =
    useDoctorBriefing();

  const [selectedEvent, setSelectedEvent] = useState<CalendarEventResponse | null>(null);

  const appointments = events
    .filter(
      e => (e.event_type === "appointment" || e.event_type === "followup") &&
           e.status !== "cancelled" && e.status !== "completed"
    )
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  useEffect(() => {
    if (activePatient) fetchEvents(activePatient.id, 30);
  }, [activePatient?.id, fetchEvents]);

  // Auto-select nearest upcoming appointment
  useEffect(() => {
    if (appointments.length > 0 && !selectedEvent && activePatient) {
      const next = appointments[0];
      setSelectedEvent(next);
      fetchBriefing(activePatient.id, next.id);
    }
  }, [appointments.length, activePatient?.id]);

  const handleSelectEvent = useCallback((event: CalendarEventResponse) => {
    setSelectedEvent(event);
    if (activePatient) fetchBriefing(activePatient.id, event.id);
  }, [activePatient?.id, fetchBriefing]);

  if (!activePatient) {
    return <p className="text-[var(--color-muted)] text-sm">No patient selected.</p>;
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <PageHeader 
        title="Doctor Briefing" 
        subtitle="Pre-appointment summary for your doctor"
      >
        <PdfDownloadBtn
          label="Medication list PDF"
          loading={pdfLoading}
          onClick={() => openMedListPdf(activePatient.id)}
        />
      </PageHeader>

      {error && <p className="text-sm text-[var(--color-alert)]">{error}</p>}

      {/* Appointment selector */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Select appointment</h2>
        {appointments.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No upcoming appointments found.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {appointments.map(event => {
              const isSelected = selectedEvent?.id === event.id;
              return (
                <button
                  key={event.id}
                  onClick={() => handleSelectEvent(event)}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    isSelected
                      ? "border-[var(--color-action)] bg-[var(--color-surface)]"
                      : "border-[var(--color-border)] bg-white hover:border-[var(--color-action)]"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <CalendarDays size={16} className="text-[var(--color-action)] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">{event.title}</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {new Date(event.event_date).toLocaleDateString()}
                        {event.specialist_type && ` · ${event.specialist_type}`}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Briefing content */}
      {selectedEvent && (
        <div className="space-y-3">
          <PageHeader 
            title={`Briefing for: ${selectedEvent.title}`}
            subtitle="Generated clinical summary"
          >
            <PdfDownloadBtn
              label="Download briefing PDF"
              loading={pdfLoading}
              onClick={() => openBriefingPdf(activePatient.id, selectedEvent.id)}
            />
          </PageHeader>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-xl bg-[var(--color-border)] animate-pulse" />
              ))}
            </div>
          ) : briefing ? (
            <BriefingCard briefing={briefing} />
          ) : null}
        </div>
      )}
    </div>
  );
}
