import { api } from "./client";
import type { DrugInteractionResponse } from "../types";

export const drugInteractionsApi = {
  list(patientId: string) {
    return api.get<DrugInteractionResponse[]>(`/patients/${patientId}/drug-interactions`);
  },

  check(patientId: string) {
    return api.post<DrugInteractionResponse[]>(`/patients/${patientId}/drug-interactions/check`);
  },
};
