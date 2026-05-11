import { api } from "./client";
import type { ChatRequest, ChatResponse, ChatActionConfirm, SuggestedPrompt } from "../types";

export const chatbotApi = {
  query(patientId: string, data: ChatRequest) {
    return api.post<ChatResponse>(`/patients/${patientId}/chatbot/query`, data);
  },

  confirmAction(patientId: string, data: ChatActionConfirm) {
    return api.post<ChatResponse>(`/patients/${patientId}/chatbot/action/confirm`, data);
  },

  suggestedPrompts(patientId: string) {
    return api.get<SuggestedPrompt[]>(`/patients/${patientId}/chatbot/suggested-prompts`);
  },
};
