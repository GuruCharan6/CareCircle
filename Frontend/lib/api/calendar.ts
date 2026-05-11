import { api } from "./client";
import type {
  CalendarEventCreate,
  CalendarEventUpdate,
  CalendarEventResponse,
  SuccessResponse,
} from "../types";

export const calendarApi = {
  create(patientId: string, data: CalendarEventCreate) {
    return api.post<CalendarEventResponse>(`/patients/${patientId}/calendar`, data);
  },

  list(patientId: string, params?: { within_days?: number }) {
    return api.get<CalendarEventResponse[]>(
      `/patients/${patientId}/calendar`,
      params as Record<string, string | number | boolean | undefined | null>
    );
  },

  get(patientId: string, eventId: string) {
    return api.get<CalendarEventResponse>(`/patients/${patientId}/calendar/${eventId}`);
  },

  update(patientId: string, eventId: string, data: CalendarEventUpdate) {
    return api.patch<CalendarEventResponse>(`/patients/${patientId}/calendar/${eventId}`, data);
  },

  confirm(patientId: string, eventId: string) {
    return api.post<CalendarEventResponse>(`/patients/${patientId}/calendar/${eventId}/confirm`);
  },

  delete(patientId: string, eventId: string) {
    return api.delete<SuccessResponse>(`/patients/${patientId}/calendar/${eventId}`);
  },
};
