import { api } from "./client";
import type { LabResultCreate, LabResultResponse, LabTrendItem } from "../types";

export const labResultsApi = {
  create(patientId: string, data: LabResultCreate) {
    return api.post<LabResultResponse>(`/patients/${patientId}/lab-results`, data);
  },

  list(patientId: string) {
    return api.get<LabResultResponse[]>(`/patients/${patientId}/lab-results`);
  },

  get(patientId: string, resultId: string) {
    return api.get<LabResultResponse>(`/patients/${patientId}/lab-results/${resultId}`);
  },

  trend(patientId: string, testName: string) {
    return api.get<LabTrendItem[]>(
      `/patients/${patientId}/lab-results/trend/${encodeURIComponent(testName)}`
    );
  },
};
