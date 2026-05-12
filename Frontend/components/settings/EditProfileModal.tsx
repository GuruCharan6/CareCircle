"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  User, Phone, Mail, Bell, MessageSquare, Sun, Moon,
  CheckCircle2, Plus, ShieldCheck,
} from "lucide-react";
import type { UserResponse } from "@/lib/types";
import { authApi } from "@/lib/api/auth";

// WhatsApp green
const WA_ICON = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

interface NotifPrefs {
  sms_alerts: boolean;
  in_app_alerts: boolean;
  morning_digest: boolean;
  evening_digest: boolean;
  whatsapp_digest: boolean;
  morning_time: string;
  evening_time: string;
}

type PhoneStep = "idle" | "entering" | "otp_sent" | "verified";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: UserResponse | null;
  onSave: (data: { name?: string; preferences?: Record<string, unknown> }) => Promise<unknown>;
  onSavePhone?: (updatedUser?: UserResponse) => void;
  onAddPatient?: () => Promise<void>;
}

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

// ── Main modal ────────────────────────────────────────────────────────────────

export function EditProfileModal({ open, onClose, user, onSave, onSavePhone, onAddPatient }: EditProfileModalProps) {
  const [name, setName] = useState("");
  const [prefs, setPrefs] = useState<NotifPrefs>({
    sms_alerts: true,
    in_app_alerts: true,
    morning_digest: true,
    evening_digest: true,
    whatsapp_digest: false,
    morning_time: "08:00",
    evening_time: "20:00",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addingPatient, setAddingPatient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone verification state
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("idle");
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [removingPhone, setRemovingPhone] = useState(false);

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
    });
  }, [user]);

  function setPref<K extends keyof NotifPrefs>(key: K, val: NotifPrefs[K]) {
    setPrefs(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    if (!name.trim()) { setError("Name cannot be empty"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), preferences: prefs as any });
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPatient() {
    if (!onAddPatient) return;
    setAddingPatient(true);
    try { await onAddPatient(); }
    finally { setAddingPatient(false); }
  }

  async function handleRemovePhone() {
    setRemovingPhone(true);
    setPhoneError(null);
    try {
      await authApi.removePhone();
      onSavePhone?.();
    } catch (e: unknown) {
      setPhoneError(e instanceof Error ? e.message : "Failed to remove phone");
    } finally {
      setRemovingPhone(false);
    }
  }

  async function handleSendPhoneOtp() {
    const fullPhone = newPhone.startsWith("+91") ? newPhone : `+91${newPhone.replace(/\D/g, "")}`;
    if (!/^\+91\d{10}$/.test(fullPhone)) {
      setPhoneError("Enter a valid 10-digit mobile number");
      return;
    }
    const phoneToSend = fullPhone;
    setPhoneBusy(true);
    setPhoneError(null);
    try {
      await authApi.sendPhoneOtp(phoneToSend);
      setNewPhone(phoneToSend); // store E.164 for OTP step
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
      const updated = await authApi.verifyPhoneOtp(newPhone, otp);
      setPhoneStep("verified");
      onSavePhone?.(updated);
    } catch (e: unknown) {
      setPhoneError(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setPhoneBusy(false);
    }
  }

  function handleClose() {
    setSaved(false);
    setError(null);
    setPhoneStep("idle");
    setNewPhone("");
    setOtp("");
    setPhoneError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Profile & Preferences" size="md">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

        {/* ── Avatar ── */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {name?.charAt(0)?.toUpperCase() || <User size={32} />}
          </div>
        </div>

        {/* ── Name ── */}
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

        {/* ── Identity ── */}
        <div className="space-y-2">
          {/* Email — always read-only */}
          {user?.email && (
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
              <Mail size={14} className="text-slate-400 shrink-0" />
              <span className="text-sm text-slate-500 font-medium">{user.email}</span>
              <span className="ml-auto text-[10px] font-bold text-slate-300 uppercase">Email</span>
            </div>
          )}

          {/* Phone — editable with OTP verification */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Mobile Number <span className="text-slate-300 normal-case font-normal">(for WhatsApp digest)</span>
            </label>

            {/* Already has verified phone */}
            {(user?.phone_number && phoneStep === "idle") && (
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

            {/* No phone yet — prompt to add */}
            {(!user?.phone_number && phoneStep === "idle") && (
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

            {/* Step: entering phone number */}
            {phoneStep === "entering" && (
              <div className="space-y-2">
                <div className="flex h-11 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500">
                  <div className="flex items-center px-3 bg-slate-100 border-r border-slate-200 shrink-0">
                    <span className="text-sm font-semibold text-slate-600">+91</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={newPhone.startsWith("+91") ? newPhone.slice(3) : newPhone}
                    onChange={e => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="98765 43210"
                    className="flex-1 px-3 text-sm font-semibold text-slate-800 focus:outline-none font-mono bg-transparent"
                    autoFocus
                  />
                </div>
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

            {/* Step: OTP entry */}
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

            {/* Step: verified */}
            {phoneStep === "verified" && (
              <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                <ShieldCheck size={14} className="text-green-500 shrink-0" />
                <span className="text-sm text-green-700 font-semibold">{newPhone}</span>
                <span className="ml-auto text-[10px] font-bold text-green-500 uppercase">Verified</span>
              </div>
            )}

            {phoneError && <p className="text-xs text-red-500 font-medium">{phoneError}</p>}
          </div>
        </div>

        {/* ── Notifications ── */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notifications</p>
          <div className="divide-y divide-slate-100">
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
              description="Receive daily digest on WhatsApp"
              icon={<span className="text-green-500"><WA_ICON /></span>}
              iconBg="bg-green-50"
              checked={prefs.whatsapp_digest}
              onChange={v => setPref("whatsapp_digest", v)}
            />
          </div>
        </div>

        {/* ── Digest Timings ── */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Daily Digest Timings</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Morning */}
            <div className={`space-y-2 rounded-xl p-3 border transition-all ${
              prefs.morning_digest ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100 opacity-50"
            }`}>
              <div className="flex items-center gap-1.5">
                <Sun size={12} className="text-amber-500" />
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Morning</span>
              </div>
              <input
                type="time"
                value={prefs.morning_time}
                onChange={e => setPref("morning_time", e.target.value)}
                disabled={!prefs.morning_digest}
                className="w-full h-9 px-2 bg-white border border-amber-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-40"
              />
              <button
                type="button"
                onClick={() => setPref("morning_digest", !prefs.morning_digest)}
                className={`w-full text-[10px] font-bold rounded-lg py-1 transition-colors ${
                  prefs.morning_digest
                    ? "bg-amber-500 text-white"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {prefs.morning_digest ? "ON" : "OFF"}
              </button>
            </div>

            {/* Evening */}
            <div className={`space-y-2 rounded-xl p-3 border transition-all ${
              prefs.evening_digest ? "bg-indigo-50 border-indigo-100" : "bg-slate-50 border-slate-100 opacity-50"
            }`}>
              <div className="flex items-center gap-1.5">
                <Moon size={12} className="text-indigo-500" />
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Evening</span>
              </div>
              <input
                type="time"
                value={prefs.evening_time}
                onChange={e => setPref("evening_time", e.target.value)}
                disabled={!prefs.evening_digest}
                className="w-full h-9 px-2 bg-white border border-indigo-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-40"
              />
              <button
                type="button"
                onClick={() => setPref("evening_digest", !prefs.evening_digest)}
                className={`w-full text-[10px] font-bold rounded-lg py-1 transition-colors ${
                  prefs.evening_digest
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {prefs.evening_digest ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Add Another Patient ── */}
        {onAddPatient && (
          <button
            type="button"
            onClick={handleAddPatient}
            disabled={addingPatient}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors text-sm font-semibold disabled:opacity-50"
          >
            <Plus size={15} />
            {addingPatient ? "Setting up…" : "Add Another Patient"}
          </button>
        )}

        {/* ── Error ── */}
        {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}

        {/* ── Actions ── */}
        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1 flex items-center justify-center gap-2"
            loading={saving}
            onClick={handleSave}
          >
            {saved ? <><CheckCircle2 size={15} /> Saved!</> : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
