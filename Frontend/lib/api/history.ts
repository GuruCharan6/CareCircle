import { api } from "./client";

export interface HistoryPdfResponse {
  url: string;
  expires_in_seconds: number;
}

export const historyApi = {
  get(patientId: string) {
    return api.get<Record<string, any>>(`/patients/${patientId}/history`);
  },

  getPdfUrl(patientId: string) {
    return api.get<HistoryPdfResponse>(`/patients/${patientId}/history/pdf`);
  },
};
