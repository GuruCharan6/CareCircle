"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePatient } from "@/hooks/usePatient";
import { useCalendar } from "@/hooks/useCalendar";
import { usePatientState } from "@/hooks/usePatientState";
import { Card } from "@/components/ui/Card";
import { CalendarMonthGrid } from "@/components/calendar/CalendarMonthGrid";
import { CalendarEventForm } from "@/components/calendar/CalendarEventForm";
import { ScheduleManagerModal } from "@/components/calendar/ScheduleManagerModal";
import { EventConfirmModal } from "@/components/calendar/EventConfirmModal";
import { GapAlert } from "@/components/calendar/GapAlert";
import { Plus, Calendar as CalendarIcon, Pill, UserPlus, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEventResponse, CalendarEventCreate } from "@/lib/types";

export default function CalendarPage() {
  const { activePatient, loading: loadingPatient } = usePatient();
  const { events, loading, error, fetch, create, update, confirm, remove } = useCalendar();
  const { state: patientState, fetch: fetchState } = usePatientState();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("id");
  const [selected, setSelected] = useState<CalendarEventResponse | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEventResponse | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [preselectedDate, setPreselectedDate] = useState<Date | undefined>();

  useEffect(() => {
    if (!activePatient) return;
    fetch(activePatient.id, 120); // 4 month lookahead
    fetchState(activePatient.id);
  }, [activePatient?.id, fetch, fetchState]);

  useEffect(() => {
    if (eventId && events.length > 0) {
      const target = events.find(e => e.id === eventId);
      if (target) {
        setSelected(target);
        // Clear param
        router.replace("/calendar");
      }
    }
  }, [eventId, events, router]);

  async function handleFormSubmit(data: CalendarEventCreate) {
    if (!activePatient) return;
    if (editingEvent) {
      await update(activePatient.id, editingEvent.id, data);
    } else {
      await create(activePatient.id, data);
    }
    setEditingEvent(null);
    setShowAddForm(false);
  }

  async function handleConfirm(eventId: string) {
    if (!activePatient) return;
    await confirm(activePatient.id, eventId);
    setSelected(null);
  }

  async function handleCancel(eventId: string) {
    if (!activePatient) return;
    await remove(activePatient.id, eventId);
    setSelected(null);
  }

  function openAddForm(date?: Date) {
    setEditingEvent(null);
    setPreselectedDate(date);
    setShowAddForm(true);
  }

  function handleEdit(event: CalendarEventResponse) {
    setEditingEvent(event);
    setSelected(null);
    setShowAddForm(true);
  }

  if (loadingPatient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="h-8 w-48 bg-[#F3F4F6] rounded mb-4" />
        <p className="text-[#9CA3AF] text-sm">Loading calendar...</p>
      </div>
    );
  }

  if (!activePatient) {
    return (
      <div className="text-center py-20">
        <p className="text-[#9CA3AF] text-sm">No patient selected.</p>
      </div>
    );
  }

  const suggested = events.filter(e => e.status === "suggested").length;
  const calendarEvents = events.filter(e => e.status !== "suggested");

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">Calendar</h1>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Track appointments, screenings, and care activities.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white p-1 rounded-full border border-[#E5E7EB] shadow-sm">
            <QuickAddButton 
              onClick={() => openAddForm()} 
              icon={<CalendarIcon size={14} />} 
              label="Appointment" 
              color="text-[#0D3B6E] hover:bg-[#0D3B6E]/5"
            />
            <QuickAddButton 
              onClick={() => openAddForm()} 
              icon={<Pill size={14} />} 
              label="Lab Test" 
              color="text-[#F59E0B] hover:bg-[#F59E0B]/5"
            />
            <QuickAddButton 
              onClick={() => openAddForm()} 
              icon={<UserPlus size={14} />} 
              label="Care Visit" 
              color="text-[#10B981] hover:bg-[#10B981]/5"
            />
          </div>
          
          <button 
            onClick={() => setShowManager(!showManager)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold shadow-sm transition-all active:scale-[0.98]",
              showManager 
                ? "bg-[#0D3B6E] text-white" 
                : "bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]"
            )}
          >
            <Edit3 size={16} />
            <span>{showManager ? "Exit Edit Mode" : "Manage Events"}</span>
          </button>
        </div>
      </div>

      {suggested > 0 && (
        <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/20 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
              <CalendarIcon size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#92400E]">Attention Needed</p>
              <p className="text-xs text-[#B45309]">You have {suggested} suggested events that need confirmation.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowManager(true)}
            className="text-xs font-bold text-[#F59E0B] hover:underline"
          >
            Review All
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500 font-medium px-2">{error}</p>}

      {patientState && (patientState.gap_actions?.length ?? 0) > 0 && (
        <GapAlert gapActions={patientState.gap_actions || []} />
      )}

      <CalendarMonthGrid
        events={calendarEvents}
        onEventClick={setSelected}
        onAddClick={openAddForm}
        isEditMode={showManager}
        onEditEvent={handleEdit}
        onDeleteEvent={(id) => activePatient && remove(activePatient.id, id)}
      />

      <CalendarEventForm 
        open={showAddForm}
        onClose={() => { setShowAddForm(false); setEditingEvent(null); }}
        onSubmit={handleFormSubmit}
        initialDate={preselectedDate}
        initialEvent={editingEvent}
      />

      <EventConfirmModal
        open={!!selected}
        onClose={() => setSelected(null)}
        event={selected}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onEdit={handleEdit}
      />
    </div>
  );
}

function QuickAddButton({ onClick, icon, label, color }: { onClick: () => void, icon: React.ReactNode, label: string, color: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-[0.98] whitespace-nowrap",
        color
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
