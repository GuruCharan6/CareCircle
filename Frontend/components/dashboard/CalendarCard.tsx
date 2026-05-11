"use client";

import { Card } from "@/components/ui/Card";
import { useCalendar } from "@/hooks/useCalendar";
import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, ChevronRight, Pill, UserPlus, X, Edit3 } from "lucide-react";
import Link from "next/link";
import { MiniCalendar } from "./MiniCalendar";
import { CalendarEventForm } from "../calendar/CalendarEventForm";
import { ScheduleManagerModal } from "../calendar/ScheduleManagerModal";
import { cn, formatDateLocal } from "@/lib/utils";
import type { CalendarEventResponse } from "@/lib/types";

export function CalendarCard({ patientId }: { patientId: string }) {
  const { events, fetch, create, update, remove, loading } = useCalendar();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventResponse | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<Date | undefined>();

  useEffect(() => {
    fetch(patientId, 30); // Fetch a full month for the mini calendar
  }, [patientId, fetch]);

  function openAddForm(date?: Date, event?: CalendarEventResponse) {
    setPreselectedDate(date);
    setEditingEvent(event || null);
    setShowAddForm(true);
  }

  async function handleFormSubmit(data: any) {
    if (editingEvent) {
      await update(patientId, editingEvent.id, data);
    } else {
      await create(patientId, data);
    }
    setEditingEvent(null);
    setShowAddForm(false);
  }

  const today = formatDateLocal(new Date());
  const upcoming = events
    .filter(e => e.event_date >= today && e.status !== "cancelled")
    .slice(0, 2);

  return (
    <Card title="Monthly View" headerAction={
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setShowManager(!showManager)}
          className={cn(
            "text-[10px] font-bold uppercase flex items-center gap-1 transition-colors",
            showManager ? "text-[var(--color-action)]" : "text-[var(--color-text)] hover:text-[var(--color-action)]"
          )}
        >
          <Edit3 size={12} /> {showManager ? "Finish" : "Edit"}
        </button>
        <Link href="/calendar" className="text-[10px] font-bold text-[var(--color-action)] uppercase flex items-center gap-1 hover:underline">
          Full Page <ChevronRight size={12} />
        </Link>
      </div>
    }>
      <div className="space-y-6">
        {loading ? (
          <div className="h-48 bg-[var(--color-border)] rounded-xl animate-pulse" />
        ) : (
          <MiniCalendar 
            events={events} 
            onDateClick={openAddForm}
            isEditMode={showManager}
            onEditEvent={(event) => openAddForm(undefined, event)}
            onDeleteEvent={(id) => remove(patientId, id)}
          />
        )}
      </div>

      <CalendarEventForm 
        open={showAddForm}
        onClose={() => { setShowAddForm(false); setEditingEvent(null); }}
        onSubmit={handleFormSubmit}
        initialDate={preselectedDate}
        initialEvent={editingEvent}
      />
    </Card>
  );
}
