"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OtpForm } from "@/components/auth/OtpForm";
import { useAuth } from "@/hooks/useAuth";

export default function OtpPage() {
  const router = useRouter();
  const { verifyOtp, sendOtp, updateProfile, loading, error } = useAuth();
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("cc_otp_phone");
    if (!stored) { router.replace("/login"); return; }
    setPhone(stored);
  }, [router]);

  async function handleVerify(token: string) {
    if (token.length !== 6) return;
    const auth = await verifyOtp(phone, token);
    if (auth) {
      const type = sessionStorage.getItem("cc_auth_type");
      if (type === "signup") {
        const savedName = sessionStorage.getItem("cc_signup_name");
        if (savedName) {
          await updateProfile({ name: savedName });
          sessionStorage.removeItem("cc_signup_name");
        }
      }
      sessionStorage.removeItem("cc_otp_phone");
      sessionStorage.removeItem("cc_auth_type");
      router.replace(type === "signup" ? "/onboarding" : "/dashboard");
    }
  }

  async function handleResend() {
    await sendOtp(phone);
  }

  if (!phone) return null;

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div>
        <div className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-action)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
            <path d="M12 18h.01" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-primary)] tracking-tight">
          Check your phone
        </h2>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          We sent a 6-digit code to
        </p>
        <p className="text-sm font-semibold font-mono text-[var(--color-primary)] mt-0.5">
          {phone}
        </p>
      </div>

      <OtpForm
        phone={phone}
        onVerify={handleVerify}
        onResend={handleResend}
        loading={loading}
        error={error}
      />
    </div>
  );
}
