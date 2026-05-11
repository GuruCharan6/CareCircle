import { api } from "./client";
import type {
  NotificationResponse,
  UnreadCountResponse,
  MarkReadRequest,
  AcknowledgeRequest,
  SuccessResponse,
} from "../types";

export const notificationsApi = {
  list(patientId: string, params?: { status?: "unread" | "read"; limit?: number }) {
    return api.get<NotificationResponse[]>(
      `/patients/${patientId}/notifications`,
      params as Record<string, string | number | boolean | undefined | null>
    );
  },

  unreadCount(patientId: string) {
    return api.get<UnreadCountResponse>(`/patients/${patientId}/notifications/unread-count`);
  },

  markRead(patientId: string, data: MarkReadRequest) {
    return api.post<SuccessResponse>(`/patients/${patientId}/notifications/mark-read`, data);
  },

  acknowledge(patientId: string, notificationId: string, data: AcknowledgeRequest) {
    return api.patch<NotificationResponse>(
      `/patients/${patientId}/notifications/${notificationId}/acknowledge`,
      data
    );
  },
};
