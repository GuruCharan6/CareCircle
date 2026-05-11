import { api } from "./client";
import type { PatientStateResponse } from "../types";

export const patientStateApi = {
  get(patientId: string) {
    return api.get<PatientStateResponse>(`/patients/${patientId}/state`);
  },
};
