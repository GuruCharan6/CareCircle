"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageCircle, CheckCircle, Copy, ExternalLink, Phone, ShieldCheck, Wifi } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { onboardingApi } from "@/lib/api/onboarding";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const WHATSAPP_URL = "https://wa.me/14155238886?text=join%20officer-magnet";
const POLL_INTERVAL_MS = 3000;

type PhoneStep = "idle" | "entering" | "otp_sent" | "verified";

export default function OnboardingWhatsAppPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isEdit = mode === "edit";

  const { user, refreshUser } = useAuth();

  const [finishing, setFinishing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // WhatsApp connection polling
  const [waitingForWA, setWaitingForWA] = useState(false);
  const [waConnected, setWaConnected] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Phone entry (email-signup users who have no phone yet)
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("idle");
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneBusy, setPhoneBusy] = useState(false);

  // Detect already-connected on mount / user change
  useEffect(() => {
    if (!user) return;
    const prefs = user.preferences ?? {};
    if (prefs.whatsapp_connected) {
      setWaConnected(true);
      stopPolling();
    }
  }, [user]);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling() {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      await refreshUser();
    }, POLL_INTERVAL_MS);
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  function handleOpenWhatsApp() {
    window.open(WHATSAPP_URL, "_blank");
    setWaitingForWA(true);
    startPolling();
  }

  async function handleFinish() {
    setFinishing(true);
    stopPolling();
    await onboardingApi.completeStep(5).catch(() => {});
    router.replace(isEdit ? "/settings" : "/dashboard");
  }

  async function handleSkip() {
    setFinishing(true);
    stopPolling();
    await onboardingApi.completeStep(5).catch(() => {});
    router.replace(isEdit ? "/settings" : "/dashboard");
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Phone OTP handlers (for email-signup users with no phone)
  async function handleSendPhoneOtp() {
    if (!newPhone.startsWith("+")) {
      setPhoneError("Use E.164 format e.g. +91XXXXXXXXXX");
      return;
    }
    setPhoneBusy(true);
    setPhoneError(null);
    try {
      await authApi.sendPhoneOtp(newPhone);
      setPhoneStep("otp_sent");
    } catch (e: unknown) {
      setPhoneError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setPhoneBusy(false);
    }
  }

  async function handleVerifyPhoneOtp() {
    if (otp.length < 4) { setPhoneError("Enter the OTP"); return; }
    setPhoneBusy(true);
    setPhoneError(null);
    try {
      await authApi.verifyPhoneOtp(newPhone, otp);
      setPhoneStep("verified");
      await refreshUser();
      setTimeout(() => { setPhoneStep("idle"); setNewPhone(""); setOtp(""); }, 1000);
    } catch (e: unknown) {
      setPhoneError(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setPhoneBusy(false);
    }
  }

  const hasPhone = !!user?.phone_number;

  // Already connected state
  if (waConnected) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-black text-[#0D3B6E] tracking-tight">
            {isEdit ? "WhatsApp Connection" : "Final Step — Join WhatsApp"}
          </h2>
        </div>

        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <div className="text-center">
            <p className="text-base font-black text-[#0D3B6E]">WhatsApp Connected!</p>
            <p className="text-xs text-slate-500 mt-1">You'll receive daily health digests on WhatsApp.</p>
          </div>
        </div>

        <Button
          variant="primary"
          className="w-full h-12 text-sm font-black shadow-xl shadow-blue-500/30 bg-gradient-to-r from-[#007AFF] to-[#0055FF] border-none"
          loading={finishing}
          onClick={handleFinish}
        >
          {isEdit ? "Done" : "Finish Setup →"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-black text-[#0D3B6E] tracking-tight">
          {isEdit ? "WhatsApp Connection" : "Final Step — Join WhatsApp"}
        </h2>
        <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
          {isEdit ? "Review your WhatsApp connection status." : "Activate hands-free updates and daily health digests."}
        </p>
      </div>

      {/* Phone entry for email-signup users */}
      {!hasPhone && (
        <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/50 space-y-3">
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-blue-500" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Add Mobile Number First</span>
          </div>
          <p className="text-[11px] text-blue-600">Need your number to receive WhatsApp messages.</p>

          {phoneStep === "idle" && (
            <Button
              variant="primary"
              className="w-full h-9 text-sm bg-blue-500 hover:bg-blue-600 border-none"
              onClick={() => setPhoneStep("entering")}
            >
              Add Number
            </Button>
          )}

          {phoneStep === "entering" && (
            <div className="space-y-2">
              <input
                type="tel"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                placeholder="+91XXXXXXXXXX"
                className="w-full h-10 px-3 bg-white border border-blue-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => { setPhoneStep("idle"); setPhoneError(null); }} disabled={phoneBusy}>
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1 h-9 text-sm" loading={phoneBusy} onClick={handleSendPhoneOtp}>
                  Send OTP
                </Button>
              </div>
            </div>
          )}

          {phoneStep === "otp_sent" && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500">OTP sent to <span className="font-semibold">{newPhone}</span></p>
              <input
                type="number"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="6-digit OTP"
                maxLength={6}
                className="w-full h-10 px-3 bg-white border border-blue-200 rounded-xl text-sm font-bold text-slate-800 tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => { setPhoneStep("entering"); setOtp(""); setPhoneError(null); }} disabled={phoneBusy}>
                  Back
                </Button>
                <Button variant="primary" className="flex-1 h-9 text-sm" loading={phoneBusy} onClick={handleVerifyPhoneOtp}>
                  Verify
                </Button>
              </div>
            </div>
          )}

          {phoneStep === "verified" && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span className="text-sm text-emerald-700 font-semibold">{newPhone} verified</span>
            </div>
          )}

          {phoneError && <p className="text-xs text-red-500 font-medium">{phoneError}</p>}
        </div>
      )}

      {/* WA join instructions — only show if phone exists */}
      {hasPhone && (
        <>
          <div className="flex flex-col md:flex-row items-stretch gap-6 py-2">
            {/* Left: Manual */}
            <div className="flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                  Method 1: Manual
                </h3>
                <div className="space-y-2">
                  <div className="group flex items-center justify-between p-3 bg-emerald-50/40 rounded-xl border border-emerald-100/50 transition-all hover:bg-emerald-50/60">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <MessageCircle size={14} className="text-emerald-600" />
                      </div>
                      <span className="text-base font-bold text-[#0D3B6E] tracking-tight">+1 415 523 8886</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard("+14155238886", "num")}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        copied === "num" ? "bg-emerald-500 text-white" : "text-slate-400 hover:bg-white hover:shadow-sm"
                      )}
                    >
                      {copied === "num" ? <CheckCircle size={14} /> : <Copy size={14} />}
                    </button>
                  </div>

                  <div className="group flex items-center justify-between p-3 bg-slate-50/40 rounded-xl border border-slate-200/40 transition-all hover:bg-slate-50/60">
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Code</p>
                      <p className="text-sm font-mono font-black text-[#0D3B6E]">join officer-magnet</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard("join officer-magnet", "code")}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        copied === "code" ? "bg-[#0D3B6E] text-white" : "text-slate-400 hover:bg-white hover:shadow-sm"
                      )}
                    >
                      {copied === "code" ? <CheckCircle size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleOpenWhatsApp}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#007AFF] hover:bg-[#0066D6] text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                Open WhatsApp
                <ExternalLink size={12} />
              </button>
            </div>

            {/* Middle: OR */}
            <div className="hidden md:flex flex-col items-center justify-center gap-4 py-4">
              <div className="w-[1px] flex-1 bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
              <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest bg-white px-1">OR</span>
              <div className="w-[1px] flex-1 bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
            </div>

            {/* Right: QR */}
            <div className="flex-1 flex flex-col items-center justify-between space-y-4">
              <div className="space-y-4 w-full flex flex-col items-center">
                <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Method 2: Scan
                </h3>
                <div className="relative p-4 bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 transition-transform hover:scale-[1.02]">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(WHATSAPP_URL)}`}
                    alt="WhatsApp QR Code"
                    className="w-[120px] h-[120px] opacity-90"
                  />
                </div>
              </div>
              <p className="text-[8px] font-bold text-slate-400 text-center">Scan to join instantly</p>
            </div>
          </div>

          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
              {["Health digests", "Daily summaries", "Voice updates", "Emergency alerts"].map(feature => (
                <div key={feature} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                    <CheckCircle size={8} className="text-emerald-500" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 tracking-tight">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Waiting for connection indicator */}
          {waitingForWA && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
              <Wifi size={14} className="text-amber-500 animate-pulse" />
              <p className="text-xs text-amber-700 font-medium">
                Waiting for WhatsApp connection… Send &quot;join officer-magnet&quot; then come back.
              </p>
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-12 text-sm font-bold"
          loading={finishing}
          onClick={handleSkip}
        >
          {waitingForWA ? "Skip for Now" : "Skip"}
        </Button>

        {hasPhone && (
          <Button
            variant="primary"
            className="flex-1 h-12 text-sm font-black shadow-xl shadow-blue-500/30 bg-gradient-to-r from-[#007AFF] to-[#0055FF] border-none hover:scale-[1.01] active:scale-[0.99] transition-all"
            loading={finishing}
            disabled={!waitingForWA && !waConnected}
            onClick={handleFinish}
          >
            Finish Setup →
          </Button>
        )}
      </div>

      {hasPhone && !waitingForWA && (
        <p className="text-[10px] text-slate-400 text-center">
          Open WhatsApp above to activate, then &quot;Finish Setup&quot; will unlock.
        </p>
      )}
    </div>
  );
}
