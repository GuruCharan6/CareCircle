import { api } from "./client";
import type { SearchResponse, DocumentType } from "../types";

interface SearchParams {
  q: string;
  filter_type?: string;
  limit?: number;
}

export const searchApi = {
  search(patientId: string, params: SearchParams) {
    return api.get<SearchResponse>(
      `/patients/${patientId}/search`,
      params as unknown as Record<string, string | number | boolean | undefined | null>
    );
  },
};
