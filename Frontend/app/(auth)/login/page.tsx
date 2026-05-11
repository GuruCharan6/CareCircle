"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { useAuth } from "@/hooks/useAuth";

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { sendOtp, googleSignIn, loading, error } = useAuth();
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  function validatePhone(value: string) {
    const clean = value.trim();
    if (!clean) return "Phone number required";
    if (!/^\+[1-9]\d{7,14}$/.test(clean)) return "Use international format: +91XXXXXXXXXX";
    return "";
  }

  async function handleSendOtp() {
    const err = validatePhone(phone);
    if (err) { setPhoneError(err); return; }
    setPhoneError("");
    const ok = await sendOtp(phone.trim());
    if (ok) {
      sessionStorage.setItem("cc_otp_phone", phone.trim());
      sessionStorage.setItem("cc_auth_type", "login");
      router.push("/otp");
    }
  }

  async function handleGoogle(idToken: string) {
    const auth = await googleSignIn(idToken);
    if (auth) router.replace("/dashboard");
  }

  const fieldError = phoneError || error;

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-primary)] tracking-tight">
          Welcome back
        </h2>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Enter your mobile number to continue
        </p>
      </div>

      {/* Phone input */}
      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-semibold text-[var(--color-text)]">
          Mobile number
        </label>
        <div
          className={[
            "flex h-11 rounded-xl border-2 overflow-hidden bg-white transition-colors duration-150",
            fieldError
              ? "border-[var(--color-alert)]"
              : "border-[var(--color-border)] focus-within:border-[var(--color-action)]",
          ].join(" ")}
        >
          <div className="flex items-center gap-2 px-3 bg-[var(--color-surface)] border-r border-[var(--color-border)] shrink-0">
            <span className="text-[var(--color-muted)]"><PhoneIcon /></span>
          </div>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={e => { setPhone(e.target.value); setPhoneError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSendOtp()}
            autoComplete="tel"
            className="flex-1 px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)]/60 focus:outline-none font-mono bg-transparent"
          />
        </div>
        {fieldError && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--color-alert)]">
            <AlertIcon />
            {fieldError}
          </p>
        )}
        {!fieldError && (
          <p className="text-xs text-[var(--color-muted)]">
            International format e.g. +91 98765 43210
          </p>
        )}
      </div>

      <Button variant="primary" size="lg" className="w-full" loading={loading} onClick={handleSendOtp}>
        Send OTP
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="text-xs text-[var(--color-muted)] font-medium">or</span>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>

      <GoogleButton onSuccess={handleGoogle} onError={() => {}} />

      <p className="text-center text-sm text-[var(--color-muted)]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-[var(--color-action)] font-semibold hover:underline">
          Get started free
        </Link>
      </p>
    </div>
  );
}
