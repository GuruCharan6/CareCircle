import { api } from "./client";
import type { PatientCreate, PatientUpdate, PatientResponse, SuccessResponse } from "../types";

export const patientsApi = {
  create(data: PatientCreate) {
    return api.post<PatientResponse>("/patients", data);
  },

  list() {
    return api.get<PatientResponse[]>("/patients");
  },

  get(id: string) {
    return api.get<PatientResponse>(`/patients/${id}`);
  },

  update(id: string, data: PatientUpdate) {
    return api.put<PatientResponse>(`/patients/${id}`, data);
  },

  delete(id: string) {
    return api.delete<SuccessResponse>(`/patients/${id}`);
  },
};
