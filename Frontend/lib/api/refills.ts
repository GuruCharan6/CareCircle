import { api } from "./client";
import type { RefillCreate, RefillResponse, RefillStatusResponse } from "../types";

export const refillsApi = {
  create(patientId: string, data: RefillCreate) {
    return api.post<RefillResponse>(`/patients/${patientId}/refills`, data);
  },

  // Default within_days=10 per backend spec
  listDue(patientId: string, params?: { within_days?: number }) {
    return api.get<RefillStatusResponse[]>(
      `/patients/${patientId}/refills/due`,
      params as Record<string, string | number | boolean | undefined | null>
    );
  },

  confirm(patientId: string, refillId: string) {
    return api.post<RefillResponse>(`/patients/${patientId}/refills/${refillId}/confirm`);
  },
};
