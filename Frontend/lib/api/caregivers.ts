import { api } from "./client";
import type { CaregiverCreate, CaregiverResponse, CaregiverRemoveResponse, SuccessResponse } from "../types";

export const caregiversApi = {
  create(patientId: string, data: CaregiverCreate) {
    return api.post<CaregiverResponse>(`/patients/${patientId}/caregivers`, data);
  },

  list(patientId: string, params?: { active_only?: boolean }) {
    return api.get<CaregiverResponse[]>(
      `/patients/${patientId}/caregivers`,
      params as Record<string, string | number | boolean | undefined | null>
    );
  },

  get(patientId: string, caregiverId: string) {
    return api.get<CaregiverResponse>(`/patients/${patientId}/caregivers/${caregiverId}`);
  },

  remove(patientId: string, caregiverId: string) {
    return api.delete<CaregiverRemoveResponse>(`/patients/${patientId}/caregivers/${caregiverId}`);
  },

  reinvite(patient_id: string, caregiver_id: string) {
    return api.post<SuccessResponse>(`/patients/${patient_id}/caregivers/${caregiver_id}/reinvite`);
  },

  update(patient_id: string, caregiver_id: string, data: CaregiverCreate) {
    return api.put<CaregiverResponse>(`/patients/${patient_id}/caregivers/${caregiver_id}`, data);
  },
};
