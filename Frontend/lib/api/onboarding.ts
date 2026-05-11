import { api } from "./client";
import type {
  OnboardingProgressResponse,
  OnboardingStatusResponse,
  DigestPreferencesUpdate,
  SuccessResponse,
} from "../types";

export const onboardingApi = {
  getProgress() {
    return api.get<OnboardingProgressResponse>("/onboarding/progress");
  },

  completeStep(stepNum: number) {
    return api.post<Record<string, unknown>>(`/onboarding/step/${stepNum}/complete`);
  },

  getStatus() {
    return api.get<OnboardingStatusResponse>("/onboarding/status");
  },

  setDigestTimes(data: DigestPreferencesUpdate) {
    return api.post<SuccessResponse>("/onboarding/digest-times", data);
  },

  reset() {
    return api.post<OnboardingProgressResponse>("/onboarding/reset");
  },
};
