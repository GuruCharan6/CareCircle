"use client";

import { useState, useCallback } from "react";
import { calendarApi } from "@/lib/api/calendar";
import type { CalendarEventCreate, CalendarEventUpdate, CalendarEventResponse } from "@/lib/types";

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEventResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (patientId: string, withinDays = 30) => {
    setLoading(true);
    setError(null);
    try {
      const data = await calendarApi.list(patientId, { within_days: withinDays });
      setEvents(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (patientId: string, data: CalendarEventCreate) => {
    const event = await calendarApi.create(patientId, data);
    setEvents(prev => [...prev, event].sort(
      (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    ));
    return event;
  }, []);

  const update = useCallback(async (patientId: string, eventId: string, data: CalendarEventUpdate) => {
    const updated = await calendarApi.update(patientId, eventId, data);
    setEvents(prev => prev.map(e => e.id === eventId ? updated : e));
    return updated;
  }, []);

  const confirm = useCallback(async (patientId: string, eventId: string) => {
    const confirmed = await calendarApi.confirm(patientId, eventId);
    setEvents(prev => prev.map(e => e.id === eventId ? confirmed : e));
    return confirmed;
  }, []);

  const remove = useCallback(async (patientId: string, eventId: string) => {
    await calendarApi.delete(patientId, eventId);
    setEvents(prev => prev.filter(e => e.id !== eventId));
  }, []);

  return { events, loading, error, fetch, create, update, confirm, remove };
}
