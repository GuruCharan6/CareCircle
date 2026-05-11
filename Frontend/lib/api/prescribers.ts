import { api } from "./client";
import type { PrescriberCreate, PrescriberUpdate, PrescriberResponse, SuccessResponse } from "../types";

export const prescribersApi = {
  create(patientId: string, data: PrescriberCreate) {
    return api.post<PrescriberResponse>(`/patients/${patientId}/prescribers`, data);
  },

  list(patientId: string, params?: { active_only?: boolean }) {
    return api.get<PrescriberResponse[]>(
      `/patients/${patientId}/prescribers`,
      params as Record<string, string | number | boolean | undefined | null>
    );
  },

  get(patientId: string, prescriberId: string) {
    return api.get<PrescriberResponse>(`/patients/${patientId}/prescribers/${prescriberId}`);
  },

  update(patientId: string, prescriberId: string, data: PrescriberUpdate) {
    return api.patch<PrescriberResponse>(`/patients/${patientId}/prescribers/${prescriberId}`, data);
  },

  deactivate(patientId: string, prescriberId: string) {
    return api.post<SuccessResponse>(`/patients/${patientId}/prescribers/${prescriberId}/deactivate`);
  },

  reactivate(patientId: string, prescriberId: string) {
    return api.post<SuccessResponse>(`/patients/${patientId}/prescribers/${prescriberId}/reactivate`);
  },
};
