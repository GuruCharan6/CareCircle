"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onboardingApi } from "@/lib/api/onboarding";
import { authStorage } from "@/lib/auth-storage";

const STEP_ROUTES: Record<number, string> = {
  1: "/onboarding/patient",
  2: "/onboarding/document",
  3: "/onboarding/digest",
  4: "/onboarding/caregiver",
  5: "/onboarding/whatsapp",
};

export default function OnboardingIndexPage() {
  const router = useRouter();

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.replace("/login"); return; }

    onboardingApi.getStatus().then(({ complete }) => {
      if (complete) { router.replace("/dashboard"); return; }
      return onboardingApi.getProgress();
    }).then(progress => {
      if (!progress) return;
      const next = progress.pending_steps[0];
      if (next && STEP_ROUTES[next]) router.replace(STEP_ROUTES[next]);
      else router.replace("/dashboard");
    }).catch(() => router.replace("/onboarding/patient"));
  }, [router]);

  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 border-2 border-[var(--color-action)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
