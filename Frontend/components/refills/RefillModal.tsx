"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { MedicationResponse, RefillCreate } from "@/lib/types";

interface RefillModalProps {
  open: boolean;
  onClose: () => void;
  medications: MedicationResponse[];
  onCreate: (data: RefillCreate) => Promise<void>;
}

export function RefillModal({ open, onClose, medications, onCreate }: RefillModalProps) {
  const [medicationId, setMedicationId] = useState("");
  const [daysSupply, setDaysSupply] = useState("30");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeMeds = medications.filter(m => m.status === "active");

  async function handleSave() {
    if (!medicationId) { setError("Select a medication"); return; }
    const days = parseInt(daysSupply, 10);
    if (!days || days < 1) { setError("Enter valid days supply"); return; }

    setSaving(true);
    setError("");
    try {
      await onCreate({ medication_id: medicationId, days_supply: days });
      onClose();
      setMedicationId("");
      setDaysSupply("30");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create refill");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Track refill" size="sm">
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--color-text)]">Medication</label>
          <select
            value={medicationId}
            onChange={e => setMedicationId(e.target.value)}
            className={selectCls}
          >
            <option value="">Select medication…</option>
            {activeMeds.map(m => (
              <option key={m.id} value={m.id}>
                {m.generic_name}{m.brand_name ? ` (${m.brand_name})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--color-text)]">Days supply</label>
          <input
            type="number"
            min="1"
            max="365"
            value={daysSupply}
            onChange={e => setDaysSupply(e.target.value)}
            className={selectCls}
            placeholder="30"
          />
        </div>

        {error && <p className="text-xs text-[var(--color-alert)]">{error}</p>}

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-1" loading={saving} onClick={handleSave}>
            Track refill
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const selectCls = "w-full h-9 px-3 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-action)] bg-white";
