"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Siren, Users, Plus, Trash2,
  LogOut, Phone, MessageSquare, Bell,
  ShieldCheck, ChevronRight,
  Mail, Sun, Moon, CheckCircle2, User, Wifi,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePatient } from "@/hooks/usePatient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EmergencyDetailsModal } from "@/components/settings/EmergencyDetailsModal";
import { authApi } from "@/lib/api/auth";

// ── WhatsApp icon ─────────────────────────────────────────────────────────────
const WA_ICON = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({
  label, description, icon, checked, onChange, iconBg,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  iconBg?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg ?? "bg-slate-100 text-slate-500"}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className="text-[11px] text-slate-400">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          checked ? "bg-blue-500" : "bg-slate-200"
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`} />
      </button>
    </div>
  );
}

// ── Notification prefs type ───────────────────────────────────────────────────
interface NotifPrefs {
  sms_alerts: boolean;
  in_app_alerts: boolean;
  morning_digest: boolean;
  evening_digest: boolean;
  whatsapp_digest: boolean;
  morning_time: string;
  evening_time: string;
  whatsapp_connected: boolean;
  whatsapp_number: string | null;
}

type PhoneStep = "idle" | "entering" | "otp_sent" | "verified";

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const { user, logout, updateProfile, refreshUser } = useAuth();
  const { patients, activePatient, setActivePatient, deletePatient } = usePatient();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [emergencyOpen, setEmergencyOpen] = useState(false);

  // Profile state
  const [name, setName] = useState("");
  const [prefs, setPrefs] = useState<NotifPrefs>({
    sms_alerts: true,
    in_app_alerts: true,
    morning_digest: true,
    evening_digest: true,
    whatsapp_digest: false,
    morning_time: "08:00",
    evening_time: "20:00",
    whatsapp_connected: false,
    whatsapp_number: null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  // WhatsApp join polling
  const [waPolling, setWaPolling] = useState(false);
  const [waVerifying, setWaVerifying] = useState(false);
  const waPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Phone verification state
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("idle");
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [removingPhone, setRemovingPhone] = useState(false);

  useEffect(() => {
    refreshUser().finally(() => setUserLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    const p = (user.preferences ?? {}) as Partial<NotifPrefs>;
    setPrefs({
      sms_alerts:      p.sms_alerts      ?? true,
      in_app_alerts:   p.in_app_alerts   ?? true,
      morning_digest:  p.morning_digest  ?? true,
      evening_digest:  p.evening_digest  ?? true,
      whatsapp_digest: p.whatsapp_digest ?? false,
      morning_time:    p.morning_time    ?? "08:00",
      evening_time:    p.evening_time    ?? "20:00",
      whatsapp_connected: p.whatsapp_connected ?? false,
      whatsapp_number: p.whatsapp_number ?? null,
    });
  }, [user]);

  // Poll refreshUser when waiting for WA webhook to fire
  useEffect(() => {
    if (!waPolling) return;
    waPollRef.current = setInterval(async () => {
      await refreshUser();
    }, 3000);
    return () => {
      if (waPollRef.current) clearInterval(waPollRef.current);
    };
  }, [waPolling, refreshUser]);

  // Stop polling when whatsapp_connected flips true
  useEffect(() => {
    if (prefs.whatsapp_connected && waPolling) {
      setWaPolling(false);
      if (waPollRef.current) clearInterval(waPollRef.current);
    }
  }, [prefs.whatsapp_connected, waPolling]);

  function setPref<K extends keyof NotifPrefs>(key: K, val: NotifPrefs[K]) {
    setPrefs(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    if (!name.trim()) { setError("Name cannot be empty"); return; }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ name: name.trim(), preferences: prefs as unknown as Record<string, unknown> });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifyWhatsApp() {
    setWaVerifying(true);
    try {
      const result = await authApi.verifyWhatsApp();
      if (result.connected) {
        await refreshUser();
        setWaPolling(false);
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setWaVerifying(false);
    }
  }

  async function handleRemovePhone() {
    setRemovingPhone(true);
    setPhoneError(null);
    try {
      await authApi.removePhone();
      refreshUser();
    } catch (e: unknown) {
      setPhoneError(e instanceof Error ? e.message : "Failed to remove phone");
    } finally {
      setRemovingPhone(false);
    }
  }

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
      setTimeout(() => { setPhoneStep("idle"); setNewPhone(""); setOtp(""); }, 1500);
    } catch (e: unknown) {
      setPhoneError(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setPhoneBusy(false);
    }
  }

  async function handleDeletePatient(id: string) {
    setDeletingId(id);
    try {
      await deletePatient(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  }

  const initials = name
    ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">Settings</h1>
        <p className="text-sm text-[var(--color-muted)] mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Profile + Notifications ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Profile */}
          <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-widest">Profile</h2>
            </div>
            <div className="p-6 space-y-5">

              {/* Avatar */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {initials || <User size={32} />}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Email — read-only */}
              {user?.email && (
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
                  <Mail size={14} className="text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-500 font-medium">{user.email}</span>
                  <span className="ml-auto text-[10px] font-bold text-slate-300 uppercase">Email</span>
                </div>
              )}

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Mobile Number <span className="text-slate-300 normal-case font-normal">(for WhatsApp digest)</span>
                </label>

                {user?.phone_number && phoneStep === "idle" && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
                    <Phone size={14} className="text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-500 font-medium">{user.phone_number}</span>
                    <div className="ml-auto flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => { setPhoneStep("entering"); setNewPhone(""); }}
                        className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePhone}
                        disabled={removingPhone}
                        className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase disabled:opacity-50"
                      >
                        {removingPhone ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  </div>
                )}

                {!user?.phone_number && phoneStep === "idle" && (
                  <button
                    type="button"
                    onClick={() => setPhoneStep("entering")}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 border border-dashed border-green-200 rounded-xl hover:bg-green-100 transition-colors"
                  >
                    <Phone size={14} className="text-green-500 shrink-0" />
                    <span className="text-sm text-green-600 font-medium">Add mobile number</span>
                    <Plus size={14} className="ml-auto text-green-400" />
                  </button>
                )}

                {phoneStep === "entering" && (
                  <div className="space-y-2">
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      placeholder="+91XXXXXXXXXX"
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <p className="text-[11px] text-slate-400">OTP sent to <span className="font-semibold text-slate-600">{newPhone}</span></p>
                    <input
                      type="number"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <button type="button" className="text-[11px] text-blue-400 hover:text-blue-600 w-full text-center" onClick={handleSendPhoneOtp} disabled={phoneBusy}>
                      Resend OTP
                    </button>
                  </div>
                )}

                {phoneStep === "verified" && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                    <ShieldCheck size={14} className="text-green-500 shrink-0" />
                    <span className="text-sm text-green-700 font-semibold">{newPhone}</span>
                    <span className="ml-auto text-[10px] font-bold text-green-500 uppercase">Verified</span>
                  </div>
                )}

                {phoneError && <p className="text-xs text-red-500 font-medium">{phoneError}</p>}
              </div>

              {/* WhatsApp — loading skeleton while initial refresh pending */}
              {user?.phone_number && userLoading && (
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl animate-pulse">
                  <div className="w-4 h-4 rounded-full bg-slate-200 shrink-0" />
                  <div className="h-3 bg-slate-200 rounded w-40" />
                </div>
              )}

              {/* WhatsApp — connected badge */}
              {user?.phone_number && !userLoading && prefs.whatsapp_connected && (
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <WA_ICON />
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">WhatsApp Connected</p>
                    {prefs.whatsapp_number && (
                      <p className="text-[11px] text-emerald-600">{String(prefs.whatsapp_number)}</p>
                    )}
                  </div>
                  <CheckCircle2 size={16} className="ml-auto text-emerald-500 shrink-0" />
                </div>
              )}

              {/* WhatsApp — not connected: show join flow */}
              {user?.phone_number && !userLoading && !prefs.whatsapp_connected && (
                <div className="p-4 rounded-2xl border transition-all bg-amber-50 border-amber-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                      WhatsApp Not Connected
                    </span>
                  </div>

                  {!waPolling ? (
                    <div className="space-y-3">
                      <p className="text-xs text-amber-700 leading-relaxed">
                        To receive digests and alerts on WhatsApp, join our sandbox first.
                      </p>
                      <Button
                        variant="primary"
                        className="w-full bg-[#25D366] hover:bg-[#20ba5a] border-none text-white shadow-sm"
                        onClick={() => {
                          window.open("https://wa.me/14155238886?text=join%20officer-magnet", "_blank");
                          setWaPolling(true);
                        }}
                      >
                        <WA_ICON />
                        <span className="ml-2">Join WhatsApp Sandbox</span>
                      </Button>
                      <p className="text-[10px] text-amber-600 text-center italic">
                        Opens WhatsApp. Just hit &quot;Send&quot;.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-amber-200 rounded-xl">
                        <Wifi size={14} className="text-amber-500 animate-pulse shrink-0" />
                        <p className="text-xs text-amber-700 font-medium">
                          Send &quot;join officer-magnet&quot; on WhatsApp, then tap verify below.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        className="w-full bg-[#25D366] hover:bg-[#20ba5a] border-none text-white shadow-sm"
                        loading={waVerifying}
                        onClick={handleVerifyWhatsApp}
                      >
                        <WA_ICON />
                        <span className="ml-2">Verify Connection</span>
                      </Button>
                      <button
                        type="button"
                        className="text-[11px] text-slate-400 hover:text-slate-600 w-full text-center"
                        onClick={() => setWaPolling(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-widest">Notifications</h2>
            </div>
            <div className="px-6 divide-y divide-slate-100">
              <Toggle
                label="SMS Alerts"
                description="Critical alerts via text message"
                icon={<MessageSquare size={15} />}
                iconBg="bg-blue-50 text-blue-500"
                checked={prefs.sms_alerts}
                onChange={v => setPref("sms_alerts", v)}
              />
              <Toggle
                label="In-App Alerts"
                description="Badge + notification inside app"
                icon={<Bell size={15} />}
                iconBg="bg-indigo-50 text-indigo-500"
                checked={prefs.in_app_alerts}
                onChange={v => setPref("in_app_alerts", v)}
              />
              <Toggle
                label="WhatsApp Digest"
                description={prefs.whatsapp_connected ? "Receive daily digest on WhatsApp" : "Join sandbox above to enable WhatsApp"}
                icon={<span className="text-green-500"><WA_ICON /></span>}
                iconBg="bg-green-50"
                checked={prefs.whatsapp_digest}
                onChange={v => setPref("whatsapp_digest", v)}
              />
            </div>
          </div>

          {/* Digest Timings */}
          <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-widest">Daily Digest Timings</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              {/* Morning */}
              <div className={`space-y-2 rounded-xl p-3 border transition-all ${
                prefs.morning_digest ? "bg-green-50 border-green-100" : "bg-slate-50 border-slate-100 opacity-50"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sun size={12} className="text-green-600" />
                    <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Morning</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPref("morning_digest", !prefs.morning_digest)}
                    className={`relative w-8 h-4 rounded-full transition-colors ${prefs.morning_digest ? "bg-green-500" : "bg-slate-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${prefs.morning_digest ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                <input
                  type="time"
                  value={prefs.morning_time}
                  onChange={e => setPref("morning_time", e.target.value)}
                  disabled={!prefs.morning_digest}
                  className="w-full h-9 px-2 bg-white border border-green-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-40"
                />
              </div>

              {/* Evening */}
              <div className={`space-y-2 rounded-xl p-3 border transition-all ${
                prefs.evening_digest ? "bg-purple-50 border-purple-100" : "bg-slate-50 border-slate-100 opacity-50"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Moon size={12} className="text-purple-600" />
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">Evening</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPref("evening_digest", !prefs.evening_digest)}
                    className={`relative w-8 h-4 rounded-full transition-colors ${prefs.evening_digest ? "bg-purple-500" : "bg-slate-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${prefs.evening_digest ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                <input
                  type="time"
                  value={prefs.evening_time}
                  onChange={e => setPref("evening_time", e.target.value)}
                  disabled={!prefs.evening_digest}
                  className="w-full h-9 px-2 bg-white border border-purple-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-40"
                />
              </div>
            </div>
          </div>

          {/* Save */}
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <Button
            variant="primary"
            className="w-full flex items-center justify-center gap-2"
            loading={saving}
            onClick={handleSave}
          >
            {saved ? <><CheckCircle2 size={15} /> Saved!</> : "Save Changes"}
          </Button>

        </div>

        {/* ── Right: Patients + Emergency + Sign out ── */}
        <div className="space-y-6">

          {/* Patient Switcher */}
          <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-[var(--color-action)]" />
                <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-widest">Patients</h2>
              </div>
              <button
                onClick={() => router.push("/onboarding/patient")}
                className="w-7 h-7 rounded-lg bg-[var(--color-surface)] text-[var(--color-action)] flex items-center justify-center hover:bg-[var(--color-border)] transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="p-3 space-y-1">
              {patients.map(p => (
                <div key={p.id} className="group">
                  {confirmDeleteId === p.id ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
                      <span className="text-xs font-semibold text-red-600 flex-1">Delete {p.name}?</span>
                      <button
                        onClick={() => handleDeletePatient(p.id)}
                        disabled={deletingId === p.id}
                        className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg disabled:opacity-50"
                      >
                        {deletingId === p.id ? "…" : "Yes"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg bg-white border border-slate-200"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-all",
                      activePatient?.id === p.id
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-[var(--color-surface)] border border-transparent"
                    )}>
                      <button
                        onClick={() => setActivePatient(p)}
                        className="flex items-center gap-3 flex-1 text-left min-w-0"
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                          activePatient?.id === p.id
                            ? "bg-[var(--color-action)] text-white"
                            : "bg-[var(--color-surface)] text-[var(--color-muted)]"
                        )}>
                          {p.name[0]}
                        </div>
                        <span className={cn(
                          "text-sm font-semibold flex-1 truncate",
                          activePatient?.id === p.id ? "text-[var(--color-primary)]" : "text-[var(--color-text)]"
                        )}>
                          {p.name}
                        </span>
                      </button>
                      {activePatient?.id === p.id && (
                        <div className="w-2 h-2 rounded-full bg-[var(--color-action)] shrink-0" />
                      )}
                      <button
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all shrink-0"
                        title="Remove patient"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Emergency */}
          <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--color-border)]">
              <Siren size={15} className="text-[var(--color-alert)]" />
              <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-widest">Emergency</h2>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} className="text-[var(--color-alert)]" />
                </div>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed pt-1">
                  Emergency contacts, nearest hospital, and crisis protocols.
                </p>
              </div>
              <button
                onClick={() => setEmergencyOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--color-alert)] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
              >
                View & Edit
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 p-3.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-colors border border-transparent hover:border-red-100"
          >
            <LogOut size={16} />
            Sign Out
          </button>

        </div>
      </div>

      <EmergencyDetailsModal
        open={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        patient={activePatient}
      />
    </div>
  );
}
