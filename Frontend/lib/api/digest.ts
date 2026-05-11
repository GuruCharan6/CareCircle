import { api } from "./client";
import type { DigestResponse, DigestPreferencesUpdate, SuccessResponse } from "../types";

export const digestApi = {
  get(patientId: string, period?: "morning" | "evening") {
    return api.get<DigestResponse>(
      `/patients/${patientId}/digest`,
      period ? { period } : undefined
    );
  },

  updatePreferences(patientId: string, data: DigestPreferencesUpdate) {
    return api.patch<SuccessResponse>(`/patients/${patientId}/digest/preferences`, data);
  },
};
