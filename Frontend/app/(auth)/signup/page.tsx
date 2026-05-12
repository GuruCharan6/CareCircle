"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { useAuth } from "@/hooks/useAuth";

function AlertIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

function CheckBadge() {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--color-ok)]">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
      <span>Free forever · No credit card</span>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { sendOtp, googleSignInWithRedirect, loading, error } = useAuth();
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  function validatePhone(value: string) {
    if (!value) return "Phone number required";
    if (!/^\+91\d{10}$/.test(value)) return "Enter a valid 10-digit Indian mobile number";
    return "";
  }

  async function handleSendOtp() {
    const err = validatePhone(phone);
    if (err) { setPhoneError(err); return; }
    setPhoneError("");
    const ok = await sendOtp(phone);
    if (ok) {
      sessionStorage.setItem("cc_otp_phone", phone);
      sessionStorage.setItem("cc_auth_type", "signup");
      router.push("/otp");
    }
  }

  // useCallback prevents GoogleButton from re-rendering on every keystroke (fixes flickering)
  const handleGoogle = useCallback(async (idToken: string) => {
    await googleSignInWithRedirect(idToken);
  }, [googleSignInWithRedirect]);

  const fieldError = phoneError || error;

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-primary)] tracking-tight">
          Start monitoring
        </h2>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Set up your care circle in minutes
        </p>
        <div className="mt-2.5">
          <CheckBadge />
        </div>
      </div>

      {/* Phone input */}
      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-semibold text-[var(--color-text)]">
          Mobile number
        </label>
        <PhoneInput
          id="phone"
          value={phone}
          onChange={(v) => { setPhone(v); setPhoneError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
          className={fieldError ? "border-[var(--color-alert)]!" : ""}
        />
        {fieldError ? (
          <p className="flex items-center gap-1.5 text-xs text-[var(--color-alert)]">
            <AlertIcon />
            {fieldError}
          </p>
        ) : (
          <p className="text-xs text-[var(--color-muted)]">
            Enter your 10-digit mobile number
          </p>
        )}
      </div>

      <Button variant="primary" size="lg" className="w-full" loading={loading} onClick={handleSendOtp}>
        Get started free
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="text-xs text-[var(--color-muted)] font-medium">or</span>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>

      <GoogleButton onSuccess={handleGoogle} onError={() => {}} />

      <p className="text-center text-sm text-[var(--color-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--color-action)] font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
