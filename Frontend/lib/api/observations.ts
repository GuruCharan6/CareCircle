import { api } from "./client";
import type { ObservationCreate, ObservationResponse, ObservationSource } from "../types";

export const observationsApi = {
  create(patientId: string, data: ObservationCreate) {
    return api.post<ObservationResponse>(`/patients/${patientId}/observations`, data);
  },

  list(patientId: string, params?: { source_type?: ObservationSource }) {
    return api.get<ObservationResponse[]>(
      `/patients/${patientId}/observations`,
      params as Record<string, string | number | boolean | undefined | null>
    );
  },

  get(patientId: string, obsId: string) {
    return api.get<ObservationResponse>(`/patients/${patientId}/observations/${obsId}`);
  },
};
