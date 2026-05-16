"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { useAuth } from "@/hooks/useAuth";

export default function SignupPage() {
  const router = useRouter();
  const { sendOtp, googleSignInWithRedirect, loading, error } = useAuth();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  function validatePhone(value: string) {
    if (!value) return "Phone number required";
    if (!/^\+91\d{10}$/.test(value)) return "Enter a valid 10-digit Indian mobile number";
    return "";
  }

  async function handleSendOtp() {
    const trimmedName = name.trim();
    if (!trimmedName) { setNameError("Name is required"); return; }
    setNameError("");
    const err = validatePhone(phone);
    if (err) { setPhoneError(err); return; }
    setPhoneError("");
    const ok = await sendOtp(phone);
    if (ok) {
      sessionStorage.setItem("cc_otp_phone", phone);
      sessionStorage.setItem("cc_auth_type", "signup");
      sessionStorage.setItem("cc_signup_name", trimmedName);
      router.push("/otp");
    }
  }

  const handleGoogle = useCallback(async (idToken: string) => {
    await googleSignInWithRedirect(idToken);
  }, [googleSignInWithRedirect]);

  const fieldError = phoneError || error;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#0D3B6E] tracking-tight">Get started free</h2>
        <p className="text-sm text-[#6B7280] mt-1">Enter your mobile number to receive an OTP</p>
      </div>

      {/* Name input */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">
          Full Name
        </label>
        <input
          id="name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => { setName(e.target.value); setNameError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
          className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-colors focus:ring-2 focus:ring-[#1D9E75]/30 ${nameError ? "border-red-400" : "border-[#E5E7EB]"}`}
        />
        {nameError && (
          <p className="text-xs text-red-500 font-medium">{nameError}</p>
        )}
      </div>

      {/* Phone input */}
      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">
          Mobile Number
        </label>
        <PhoneInput
          id="phone"
          value={phone}
          onChange={(v) => { setPhone(v); setPhoneError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
          className={fieldError ? "border-red-400!" : ""}
        />
        {fieldError && (
          <p className="text-xs text-red-500 font-medium">{fieldError}</p>
        )}
      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full flex items-center justify-center gap-2 bg-[#0D3B6E] hover:bg-[#0a2f58]"
        loading={loading}
        onClick={handleSendOtp}
      >
        Send OTP <ArrowRight size={16} />
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#E5E7EB]" />
        <span className="text-xs text-[#9CA3AF] font-medium">or</span>
        <div className="flex-1 h-px bg-[#E5E7EB]" />
      </div>

      <GoogleButton onSuccess={handleGoogle} onError={() => {}} />

      {/* WhatsApp note */}
      <div className="flex items-start gap-2.5 px-3 py-3 bg-[#E8F5F2] rounded-xl">
        <span className="text-base shrink-0 mt-0.5">💬</span>
        <p className="text-[11px] text-[#2D7A5F] leading-relaxed">
          You&apos;ll receive morning &amp; evening health digests via WhatsApp — no extra setup required.
        </p>
      </div>

      <p className="text-center text-sm text-[#6B7280]">
        Already have an account?{" "}
        <Link href="/login" className="text-[#1D9E75] font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
