"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { RefillStatusResponse, MedicationResponse } from "@/lib/types";

interface RefillCardProps {
  refill: RefillStatusResponse;
  med: MedicationResponse;
  onConfirm: (daysSupply: number) => Promise<void>;
}

function timesPerDay(frequency: string | null | undefined): number {
  if (!frequency) return 1;
  const f = frequency.toLowerCase();
  if (/four|4.*(day|daily)/.test(f)) return 4;
  if (/three|thrice|3.*(day|daily)/.test(f)) return 3;
  if (/twice|two|bid|2.*(day|daily)/.test(f)) return 2;
  return 1;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RefillCard({ refill, med, onConfirm }: RefillCardProps) {
  const defaultDays = 30;
  const [editing, setEditing] = useState(false);
  const [daysSupply, setDaysSupply] = useState(defaultDays);
  const [qty, setQty] = useState(defaultDays * timesPerDay(med.frequency));
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const freq = timesPerDay(med.frequency);

  function handleDaysChange(val: number) {
    setDaysSupply(val);
    setQty(val * freq);
  }

  function handleQtyChange(val: number) {
    setQty(val);
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      await onConfirm(daysSupply);
      setConfirmed(true);
    } finally {
      setConfirming(false);
    }
  }

  const dueLabel =
    refill.days_until_due <= 0
      ? "Due now"
      : `Due in ${refill.days_until_due} day${refill.days_until_due !== 1 ? "s" : ""}`;

  const borderColor =
    refill.urgency === "critical" ? "border-red-400"
    : refill.urgency === "soon"   ? "border-amber-400"
    :                               "border-green-400";

  const badgeBg =
    refill.urgency === "critical" ? "bg-red-100 text-red-700"
    : refill.urgency === "soon"   ? "bg-amber-100 text-amber-700"
    :                               "bg-green-100 text-green-700";

  if (confirmed) {
    return (
      <div className="bg-white rounded-2xl border-2 border-green-400 p-5 flex flex-col items-center justify-center gap-2 min-h-[180px]">
        <Check size={32} className="text-green-600" />
        <p className="font-bold text-green-700">Refill Confirmed</p>
        <p className="text-xs text-[var(--color-muted)]">{med.generic_name} — marked as handled</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border-2 ${borderColor} p-5 flex flex-col gap-4`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-lg text-[var(--color-text)] leading-tight">
            {med.generic_name}{med.dose ? ` ${med.dose}` : ""}
          </p>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            {[med.prescriber_name ? `Dr. ${med.prescriber_name.replace(/^Dr\.?\s*/i, "")}` : null, med.brand_name].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${badgeBg}`}>
          {dueLabel}
        </span>
      </div>

      {/* Details / Edit */}
      {editing ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wide">Days Supply</span>
            <input
              type="number"
              min={1}
              max={365}
              value={daysSupply}
              onChange={e => handleDaysChange(Number(e.target.value))}
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action)]/30 focus:border-[var(--color-action)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wide">Qty Needed</span>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={e => handleQtyChange(Number(e.target.value))}
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action)]/30 focus:border-[var(--color-action)]"
            />
          </label>
          <div className="col-span-2 text-xs text-[var(--color-muted)]">
            Dose: {med.dose ?? "—"} × {freq}/day
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <InfoRow label="Days Supply" value={`${daysSupply} days`} />
          <InfoRow
            label="Last Refill"
            value={formatDate(refill.next_refill_date
              ? new Date(new Date(refill.next_refill_date).getTime() - daysSupply * 86400000).toISOString()
              : null
            )}
          />
          <InfoRow
            label="Dose"
            value={med.dose && med.frequency ? `${med.dose} × ${freq}/day` : med.dose ?? "—"}
          />
          <InfoRow label="Qty Needed" value={`${qty} tablets`} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-action)] hover:bg-[var(--color-action)]/90 text-white text-sm font-bold transition-colors disabled:opacity-60"
        >
          <Check size={15} />
          {confirming ? "Confirming…" : "Confirm Refill"}
        </button>

        {editing ? (
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm font-semibold text-[var(--color-muted)] hover:bg-[var(--color-bg)] transition-colors"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-bg)] transition-colors"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-[var(--color-muted)]">{label}: </span>
      <span className="font-semibold text-[var(--color-text)]">{value}</span>
    </div>
  );
}
