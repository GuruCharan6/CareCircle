import { api } from "./client";
import type { MedicationCreate, MedicationUpdate, MedicationResponse, SuccessResponse } from "../types";

export const medicationsApi = {
  create(patientId: string, data: MedicationCreate) {
    return api.post<MedicationResponse>(`/patients/${patientId}/medications`, data);
  },

  list(patientId: string, params?: { active_only?: boolean }) {
    return api.get<MedicationResponse[]>(
      `/patients/${patientId}/medications`,
      params as Record<string, string | number | boolean | undefined | null>
    );
  },

  get(patientId: string, medId: string) {
    return api.get<MedicationResponse>(`/patients/${patientId}/medications/${medId}`);
  },

  update(patientId: string, medId: string, data: MedicationUpdate) {
    return api.patch<MedicationResponse>(`/patients/${patientId}/medications/${medId}`, data);
  },

  // Backend soft-deletes (sets status = discontinued)
  discontinue(patientId: string, medId: string) {
    return api.delete<SuccessResponse>(`/patients/${patientId}/medications/${medId}`);
  },
};
