"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { onboardingApi } from "@/lib/api/onboarding";
import { usePatient } from "@/hooks/usePatient";
import { caregiversApi } from "@/lib/api/caregivers";
import { UserPlus, CheckCircle, Phone, User } from "lucide-react";
import { cn } from "@/lib/utils";

function OnboardingCaregiverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isEdit = mode === "edit";

  const { activePatient } = usePatient();
  const [skipping, setSkipping] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    role: "Family",
  });

  async function handleSkip() {
    setSkipping(true);
    await onboardingApi.completeStep(4).catch(() => { });
    const nextUrl = isEdit ? "/onboarding/whatsapp?mode=edit" : "/onboarding/whatsapp";
    router.push(nextUrl);
  }

  async function handleAddCaregiver() {
    if (!activePatient) return;
    if (!form.name || !form.phone) {
      setError("Name and phone are required");
      return;
    }
    const phoneValue = (form.phone || "").toString().trim();
    let normalizedPhone = phoneValue;
    if (normalizedPhone && !normalizedPhone.startsWith("+")) {
      normalizedPhone = `+${normalizedPhone}`;
    }

    setAdding(true);
    setError("");
    try {
      await caregiversApi.create(activePatient.id, {
        name: form.name,
        phone_number: normalizedPhone,
        notes: `Role: ${form.role}`,
      });
      await onboardingApi.completeStep(4).catch(() => { });
      router.push(isEdit ? "/onboarding/whatsapp?mode=edit" : "/onboarding/whatsapp");
    } catch (e: any) {
      setError(e.message || "Failed to add caregiver");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-black text-[#0D3B6E] tracking-tight">
          {isEdit ? "Manage Care Team" : "Step 4 — Care Team"}
        </h2>
        <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
          Add family or helpers to receive health alerts and medication reminders.
        </p>
      </div>

      {!showForm ? (
        <div className="space-y-6 py-4">
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="group w-full p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 transition-all hover:border-[#0D3B6E] hover:bg-slate-50 active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#0D3B6E] group-hover:text-white transition-colors">
                <UserPlus size={16} />
              </div>
              <span className="font-bold text-[#0D3B6E]">Add a Caregiver Now</span>
            </button>

            <button
              onClick={handleSkip}
              disabled={skipping}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
            >
              {skipping ? "Skipping..." : "I'll Add Them Later →"}
            </button>
          </div>

          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 text-center">How it works</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                "WhatsApp Invite",
                "Visit Tracking",
                "Shared Alerts",
                "Medication Logs"
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                  <CheckCircle size={10} className="text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <User size={14} />
              </div>
              <input
                type="text"
                placeholder="Caregiver Name"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D3B6E] focus:ring-1 focus:ring-[#0D3B6E] transition-all"
              />
            </div>
            <div className="flex h-11 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:border-[#0D3B6E] focus-within:ring-1 focus-within:ring-[#0D3B6E]">
              <div className="flex items-center px-3 bg-slate-100 border-r border-slate-200 shrink-0">
                <span className="text-sm font-semibold text-slate-600">+91</span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="98765 43210"
                value={form.phone.startsWith("+91") ? form.phone.slice(3) : form.phone}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm(prev => ({ ...prev, phone: digits ? `+91${digits}` : "" }));
                }}
                className="flex-1 px-3 text-sm font-mono focus:outline-none bg-transparent"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["Family", "Nurse", "Helper"].map(role => (
                <button
                  key={role}
                  onClick={() => setForm(prev => ({ ...prev, role }))}
                  className={cn(
                    "py-2 rounded-lg text-[10px] font-bold transition-all border",
                    form.role === role ? "bg-[#0D3B6E] border-[#0D3B6E] text-white" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                  )}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[10px] text-red-500 font-bold text-center">{error}</p>}

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="primary"
              className="w-full h-12 text-sm font-black shadow-lg bg-[#0D3B6E]"
              loading={adding}
              onClick={handleAddCaregiver}
            >
              Add Caregiver & Continue →
            </Button>
            <button
              onClick={() => setShowForm(false)}
              className="w-full py-2 text-[10px] font-bold text-slate-400 hover:text-[#0D3B6E] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnboardingCaregiverPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OnboardingCaregiverContent />
    </Suspense>
  );
}