"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { usePatient } from "@/hooks/usePatient";
import { onboardingApi } from "@/lib/api/onboarding";
import type { Gender } from "@/lib/types";

export default function OnboardingPatientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isEdit = mode === "edit";

  const { createPatient, updatePatient, activePatient } = usePatient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showSecondary, setShowSecondary] = useState(false);

  const [form, setForm] = useState({
    name: "",
    date_of_birth: "",
    gender: "other" as Gender,
    blood_type: "",
    primary_city: "",
    known_conditions: "",
    known_allergies: "",
    emergency_notes: "",
    ec1_name: "",
    ec1_phone: "",
    ec1_relationship: "",
    ec2_name: "",
    ec2_phone: "",
    ec2_relationship: "",
    doc_name: "",
    doc_phone: "",
    hospital_name: "",
    hospital_phone: "",
  });

  // Pre-fill form if in edit mode
  useEffect(() => {
    if (isEdit && activePatient) {
      setForm({
        name: activePatient.name || "",
        date_of_birth: activePatient.date_of_birth || "",
        gender: activePatient.gender || "other",
        blood_type: activePatient.blood_type || "",
        primary_city: activePatient.primary_city || "",
        known_conditions: activePatient.known_conditions?.join(", ") || "",
        known_allergies: activePatient.known_allergies?.join(", ") || "",
        emergency_notes: activePatient.emergency_notes || "",
        ec1_name: activePatient.emergency_contact_primary?.name || "",
        ec1_phone: activePatient.emergency_contact_primary?.phone || "",
        ec1_relationship: activePatient.emergency_contact_primary?.relationship || "",
        ec2_name: activePatient.emergency_contact_secondary?.name || "",
        ec2_phone: activePatient.emergency_contact_secondary?.phone || "",
        ec2_relationship: activePatient.emergency_contact_secondary?.relationship || "",
        doc_name: activePatient.primary_physician?.name || "",
        doc_phone: activePatient.primary_physician?.phone || "",
        hospital_name: activePatient.nearest_hospital?.name || "",
        hospital_phone: activePatient.nearest_hospital?.phone || "",
      });
      if (activePatient.emergency_contact_secondary?.name) {
        setShowSecondary(true);
      }
    }
  }, [isEdit, activePatient]);

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.name || !form.date_of_birth) {
      setError("Name and date of birth are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const normalizePhone = (p: string) =>
        p ? (p.startsWith("+") ? p : `+91${p.replace(/\D/g, "")}`) : p;

      const payload = {
        name: form.name,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        blood_type: (form.blood_type as never) || undefined,
        primary_city: form.primary_city || undefined,
        known_conditions: form.known_conditions
          ? form.known_conditions.split(",").map(s => s.trim()).filter(Boolean)
          : [],
        known_allergies: form.known_allergies
          ? form.known_allergies.split(",").map(s => s.trim()).filter(Boolean)
          : [],
        emergency_notes: form.emergency_notes || undefined,
        emergency_contact_primary:
          form.ec1_name && form.ec1_phone
            ? { name: form.ec1_name, phone: normalizePhone(form.ec1_phone), relationship: form.ec1_relationship || "Family" }
            : undefined,
        emergency_contact_secondary:
          showSecondary && form.ec2_name && form.ec2_phone
            ? { name: form.ec2_name, phone: normalizePhone(form.ec2_phone), relationship: form.ec2_relationship || "Family" }
            : undefined,
        primary_physician:
          form.doc_name && form.doc_phone
            ? { name: form.doc_name, phone: normalizePhone(form.doc_phone) }
            : undefined,
        nearest_hospital:
          form.hospital_name && form.hospital_phone
            ? { name: form.hospital_name, phone: normalizePhone(form.hospital_phone) }
            : undefined,
      };

      if (isEdit && activePatient) {
        await updatePatient(activePatient.id, payload);
      } else {
        await createPatient(payload);
      }
      
      await onboardingApi.completeStep(1);
      const nextUrl = isEdit ? "/onboarding/document?mode=edit" : "/onboarding/document";
      router.push(nextUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save patient");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-primary)]">
          {isEdit ? "Edit Patient info" : "Step 1 of 5 — Patient info"}
        </h2>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          {isEdit ? `Update details for ${form.name}` : "Tell us about the person you're caring for"}
        </p>
      </div>

      {/* Basic info */}
      <Section title="Basic Information">
        <Field label="Full name *">
          <input
            type="text"
            placeholder="e.g. Meera Krishnan"
            value={form.name}
            onChange={e => update("name", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Date of birth *">
          <input
            type="date"
            value={form.date_of_birth}
            onChange={e => update("date_of_birth", e.target.value)}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gender">
            <select value={form.gender} onChange={e => update("gender", e.target.value)} className={inputCls}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Blood type">
            <select value={form.blood_type} onChange={e => update("blood_type", e.target.value)} className={inputCls}>
              <option value="">Not known</option>
              {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
        </div>
        <Field label="City">
          <input
            type="text"
            placeholder="e.g. Chennai"
            value={form.primary_city}
            onChange={e => update("primary_city", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Known conditions" hint="Comma-separated">
          <input
            type="text"
            placeholder="e.g. Type 2 Diabetes, Hypertension"
            value={form.known_conditions}
            onChange={e => update("known_conditions", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Known allergies" hint="Comma-separated">
          <input
            type="text"
            placeholder="e.g. Penicillin, Sulfa drugs"
            value={form.known_allergies}
            onChange={e => update("known_allergies", e.target.value)}
            className={inputCls}
          />
        </Field>
      </Section>

      {/* Primary emergency contact */}
      <Section title="Primary Emergency Contact" accent>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <input
              type="text"
              placeholder="e.g. Ravi Krishnan"
              value={form.ec1_name}
              onChange={e => update("ec1_name", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Relationship">
            <input
              type="text"
              placeholder="e.g. Son, Spouse"
              value={form.ec1_relationship}
              onChange={e => update("ec1_relationship", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Phone number">
          <div className="flex h-10 rounded-lg border border-[var(--color-border)] overflow-hidden bg-white focus-within:border-[var(--color-action)] focus-within:ring-1 focus-within:ring-[var(--color-action)]">
            <div className="flex items-center px-3 bg-[var(--color-surface)] border-r border-[var(--color-border)] shrink-0">
              <span className="text-sm font-semibold text-[var(--color-text)]">+91</span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="98765 43210"
              value={form.ec1_phone.startsWith("+91") ? form.ec1_phone.slice(3) : form.ec1_phone}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                update("ec1_phone", digits ? `+91${digits}` : "");
              }}
              className="flex-1 px-3 text-sm font-mono focus:outline-none bg-transparent"
            />
          </div>
        </Field>
      </Section>

      {/* Secondary emergency contact */}
      {!showSecondary ? (
        <button
          type="button"
          onClick={() => setShowSecondary(true)}
          className="text-sm text-[var(--color-action)] font-medium hover:underline"
        >
          + Add secondary emergency contact (optional)
        </button>
      ) : (
        <Section title="Secondary Emergency Contact (Optional)">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input
                type="text"
                placeholder="e.g. Priya Krishnan"
                value={form.ec2_name}
                onChange={e => update("ec2_name", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Relationship">
              <input
                type="text"
                placeholder="e.g. Daughter"
                value={form.ec2_relationship}
                onChange={e => update("ec2_relationship", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Phone number">
            <div className="flex h-10 rounded-lg border border-[var(--color-border)] overflow-hidden bg-white focus-within:border-[var(--color-action)] focus-within:ring-1 focus-within:ring-[var(--color-action)]">
              <div className="flex items-center px-3 bg-[var(--color-surface)] border-r border-[var(--color-border)] shrink-0">
                <span className="text-sm font-semibold text-[var(--color-text)]">+91</span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="98765 43210"
                value={form.ec2_phone.startsWith("+91") ? form.ec2_phone.slice(3) : form.ec2_phone}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  update("ec2_phone", digits ? `+91${digits}` : "");
                }}
                className="flex-1 px-3 text-sm font-mono focus:outline-none bg-transparent"
              />
            </div>
          </Field>
          <button
            type="button"
            onClick={() => { setShowSecondary(false); update("ec2_name", ""); update("ec2_phone", ""); update("ec2_relationship", ""); }}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-alert)]"
          >
            Remove secondary contact
          </button>
        </Section>
      )}

      {/* Primary physician */}
      <Section title="Primary Physician">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Doctor name">
            <input
              type="text"
              placeholder="e.g. Dr. Anand Kumar"
              value={form.doc_name}
              onChange={e => update("doc_name", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Phone number">
            <div className="flex h-10 rounded-lg border border-[var(--color-border)] overflow-hidden bg-white focus-within:border-[var(--color-action)] focus-within:ring-1 focus-within:ring-[var(--color-action)]">
              <div className="flex items-center px-3 bg-[var(--color-surface)] border-r border-[var(--color-border)] shrink-0">
                <span className="text-sm font-semibold text-[var(--color-text)]">+91</span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="98765 43210"
                value={form.doc_phone.startsWith("+91") ? form.doc_phone.slice(3) : form.doc_phone}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  update("doc_phone", digits ? `+91${digits}` : "");
                }}
                className="flex-1 px-3 text-sm font-mono focus:outline-none bg-transparent"
              />
            </div>
          </Field>
        </div>
      </Section>

      {/* Nearest hospital */}
      <Section title="Nearest Emergency Hospital">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hospital name">
            <input
              type="text"
              placeholder="e.g. Apollo Hospital"
              value={form.hospital_name}
              onChange={e => update("hospital_name", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Emergency number">
            <input
              type="tel"
              placeholder="e.g. 044-28290200"
              value={form.hospital_phone}
              onChange={e => update("hospital_phone", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* Emergency notes */}
      <Section title="Additional Emergency Notes">
        <Field label="Special instructions">
          <textarea
            rows={3}
            placeholder="e.g. Has pacemaker. Do not use MRI. Wears hearing aid."
            value={form.emergency_notes}
            onChange={e => update("emergency_notes", e.target.value)}
            className={inputCls + " resize-none h-auto py-2"}
          />
        </Field>
      </Section>

      {error && <p className="text-sm text-[var(--color-alert)]">{error}</p>}

      <Button variant="primary" className="w-full" loading={saving} onClick={handleSubmit}>
        Continue →
      </Button>
    </div>
  );
}

const inputCls = "w-full h-10 px-3 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-action)] focus:ring-1 focus:ring-[var(--color-action)] transition-colors bg-white";

function Section({ title, accent, children }: { title: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-3 p-4 rounded-xl border ${accent ? "border-red-200 bg-red-50/40" : "border-[var(--color-border)] bg-[var(--color-surface)]"}`}>
      <h3 className={`text-sm font-semibold ${accent ? "text-red-700" : "text-[var(--color-text)]"}`}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-[var(--color-text)]">
        {label}
        {hint && <span className="text-[var(--color-muted)] font-normal ml-1 text-xs">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
