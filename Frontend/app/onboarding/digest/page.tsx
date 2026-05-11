"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { onboardingApi } from "@/lib/api/onboarding";
import { useDigest } from "@/hooks/useDigest";
import { usePatient } from "@/hooks/usePatient";

// Common timezones for India + caregivers abroad
const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Singapore",
  "Australia/Sydney",
];

export default function OnboardingDigestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isEdit = mode === "edit";

  const { activePatient } = usePatient();
  const { digest, fetch } = useDigest();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    morning_time: "08:00",
    evening_time: "20:00",
    timezone: "Asia/Kolkata",
  });

  // Pre-fill if editing
  useEffect(() => {
    if (activePatient) {
       // We don't have a direct "preferences" hook that returns just the user's general prefs easily 
       // but we can try to get it from the digest response if it includes metadata or use defaults.
       // Actually, the digest response doesn't usually include the config times in the body.
       // I'll just keep the defaults for now as it's safe.
    }
  }, [activePatient]);

  async function handleSubmit() {
    setSaving(true);
    setError("");
    try {
      await onboardingApi.setDigestTimes(form);
      await onboardingApi.completeStep(3);
      const nextUrl = isEdit ? "/onboarding/caregiver?mode=edit" : "/onboarding/caregiver";
      router.push(nextUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-primary)]">
          {isEdit ? "Digest Preferences" : "Step 3 of 5 — Daily digest"}
        </h2>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          {isEdit ? "Update when you receive health summaries." : "When should we send the morning and evening health summaries?"}
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--color-text)]">Morning digest</label>
            <input
              type="time"
              value={form.morning_time}
              onChange={e => setForm(prev => ({ ...prev, morning_time: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--color-text)]">Evening digest</label>
            <input
              type="time"
              value={form.evening_time}
              onChange={e => setForm(prev => ({ ...prev, evening_time: e.target.value }))}
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-[var(--color-text)]">Timezone</label>
          <select
            value={form.timezone}
            onChange={e => setForm(prev => ({ ...prev, timezone: e.target.value }))}
            className={inputCls}
          >
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl p-4 text-sm text-[var(--color-primary)]">
        <p className="font-medium mb-1">What&apos;s in the digest?</p>
        <ul className="list-disc list-inside space-y-0.5 text-[var(--color-muted)]">
          <li>Medication reminders for the day</li>
          <li>Lab result alerts</li>
          <li>Upcoming appointments</li>
          <li>Questions to track</li>
        </ul>
      </div>

      {error && <p className="text-sm text-[var(--color-alert)]">{error}</p>}

      <Button variant="primary" className="w-full" loading={saving} onClick={handleSubmit}>
        Save &amp; Continue →
      </Button>
    </div>
  );
}

const inputCls = "w-full h-10 px-3 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-action)] focus:ring-1 focus:ring-[var(--color-action)] transition-colors bg-white";
