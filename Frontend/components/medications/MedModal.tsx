"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { MedicationCreate, MedicationResponse } from "@/lib/types";

interface MedModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: MedicationCreate) => Promise<void>;
  existing?: MedicationResponse | null;
}

const EMPTY: MedicationCreate = {
  generic_name: "",
  brand_name: "",
  drug_class: "",
  dose: "",
  frequency: "",
  timing: "",
  prescriber_name: "",
  prescribed_date: "",
  valid_from: "",
  valid_until: "",
  notes: "",
};

export function MedModal({ open, onClose, onSave, existing }: MedModalProps) {
  const [form, setForm] = useState<MedicationCreate>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (existing) {
      setForm({
        generic_name:    existing.generic_name,
        brand_name:      existing.brand_name ?? "",
        drug_class:      existing.drug_class ?? "",
        dose:            existing.dose ?? "",
        frequency:       existing.frequency ?? "",
        timing:          existing.timing ?? "",
        prescriber_name: existing.prescriber_name ?? "",
        prescribed_date: existing.prescribed_date ?? "",
        valid_from:      existing.valid_from ?? "",
        valid_until:     existing.valid_until ?? "",
        notes:           existing.notes ?? "",
      });
    } else {
      setForm(EMPTY);
    }
    setError("");
  }, [existing, open]);

  function set(field: keyof MedicationCreate, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.generic_name.trim()) {
      setError("Generic name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...form,
        brand_name:      form.brand_name      || undefined,
        drug_class:      form.drug_class      || undefined,
        dose:            form.dose            || undefined,
        frequency:       form.frequency       || undefined,
        timing:          form.timing          || undefined,
        prescriber_name: form.prescriber_name || undefined,
        prescribed_date: form.prescribed_date || undefined,
        valid_from:      form.valid_from      || undefined,
        valid_until:     form.valid_until     || undefined,
        notes:           form.notes           || undefined,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? "Edit Medication" : "Add Medication"}
      size="lg"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Generic name *">
            <input
              type="text"
              placeholder="e.g. Metformin"
              value={form.generic_name}
              onChange={e => set("generic_name", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Brand name">
            <input
              type="text"
              placeholder="e.g. Glucophage"
              value={form.brand_name ?? ""}
              onChange={e => set("brand_name", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Drug class">
            <input
              type="text"
              placeholder="e.g. Biguanide"
              value={form.drug_class ?? ""}
              onChange={e => set("drug_class", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Dose">
            <input
              type="text"
              placeholder="e.g. 500mg"
              value={form.dose ?? ""}
              onChange={e => set("dose", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Frequency">
            <input
              type="text"
              placeholder="e.g. Twice daily"
              value={form.frequency ?? ""}
              onChange={e => set("frequency", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Timing">
            <input
              type="text"
              placeholder="e.g. After meals"
              value={form.timing ?? ""}
              onChange={e => set("timing", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Prescriber name">
            <input
              type="text"
              placeholder="e.g. Dr. Sharma"
              value={form.prescriber_name ?? ""}
              onChange={e => set("prescriber_name", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Prescribed date">
            <input
              type="date"
              value={form.prescribed_date ?? ""}
              onChange={e => set("prescribed_date", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Valid from">
            <input
              type="date"
              value={form.valid_from ?? ""}
              onChange={e => set("valid_from", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Valid until">
            <input
              type="date"
              value={form.valid_until ?? ""}
              onChange={e => set("valid_until", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            rows={2}
            placeholder="Any additional notes..."
            value={form.notes ?? ""}
            onChange={e => set("notes", e.target.value)}
            className={inputCls + " resize-none h-16"}
          />
        </Field>
      </div>

      {error && <p className="text-sm text-[var(--color-alert)] mt-3">{error}</p>}

      <div className="flex gap-3 mt-5">
        <Button variant="ghost" className="flex-1" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" className="flex-1" onClick={handleSave} loading={saving}>
          {existing ? "Save changes" : "Add medication"}
        </Button>
      </div>
    </Modal>
  );
}

const inputCls = "w-full h-9 px-3 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-action)] focus:ring-1 focus:ring-[var(--color-action)] transition-colors bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-[var(--color-text)]">{label}</label>
      {children}
    </div>
  );
}
