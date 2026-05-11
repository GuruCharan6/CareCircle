import { api } from "./client";
import type { PdfUrlResponse } from "../types";

export interface DoctorBriefingResponse {
  event_id: string;
  patient_id: string;
  meds_from_other_doctors: Array<{
    generic_name: string;
    prescriber_name: string | null;
    prescriber_specialty: string | null;
    dose: string | null;
  }>;
  lab_trends: Array<{
    test_name_display: string;
    direction: "improving" | "worsening" | "stable";
    latest_value: string;
    unit: string;
    is_abnormal: boolean;
  }>;
  behavioral_notes: string[];
  questions_to_raise: string[];
}

export const doctorBriefingApi = {
  get(patientId: string, eventId: string) {
    return api.get<DoctorBriefingResponse>(`/patients/${patientId}/doctor-briefing/${eventId}`);
  },

  getPdf(patientId: string, eventId: string) {
    return api.get<PdfUrlResponse>(`/patients/${patientId}/doctor-briefing/${eventId}/pdf`);
  },

  getMedListPdf(patientId: string) {
    return api.get<PdfUrlResponse>(`/patients/${patientId}/medication-list-pdf`);
  },
};
