import { api } from "./client";
import type { CrisisPacketResponse, CrisisTrigger, PdfUrlResponse, SuccessResponse } from "../types";

export const crisisApi = {
  get(patientId: string) {
    return api.get<CrisisPacketResponse>(`/patients/${patientId}/crisis`);
  },

  enter(patientId: string, trigger: CrisisTrigger) {
    return api.post<CrisisPacketResponse>(`/patients/${patientId}/crisis/enter`, {
      accessed_at: new Date().toISOString(),
      trigger: trigger,
    });
  },

  exit(patientId: string) {
    return api.post<SuccessResponse>(`/patients/${patientId}/crisis/exit`);
  },

  getPdf(patientId: string) {
    return api.get<PdfUrlResponse>(`/patients/${patientId}/crisis/pdf`);
  },

  followUp(patientId: string, responseText: string) {
    return api.post<{ message: string; notification_id: string | null }>(
      `/patients/${patientId}/crisis/follow-up`,
      { response_text: responseText }
    );
  },
};
