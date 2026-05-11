"use client";

import { Pill, CheckCircle } from "lucide-react";
import { RefillUrgencyBadge } from "./RefillUrgencyBadge";
import { Button } from "@/components/ui/Button";
import type { RefillStatusResponse } from "@/lib/types";

interface RefillListProps {
  refills: RefillStatusResponse[];
  onConfirm: (refillId: string) => Promise<void>;
  loading?: boolean;
}

export function RefillList({ refills, onConfirm, loading }: RefillListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-16 rounded-xl bg-[var(--color-border)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!refills.length) {
    return (
      <div className="text-center py-12 text-[var(--color-muted)] text-sm flex flex-col items-center gap-2">
        <CheckCircle size={32} className="text-[var(--color-ok)]" />
        No refills due in the next 10 days.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {refills.map(r => (
        <RefillRow key={r.id} refill={r} onConfirm={onConfirm} />
      ))}
    </div>
  );
}

function RefillRow({
  refill,
  onConfirm,
}: {
  refill: RefillStatusResponse;
  onConfirm: (id: string) => Promise<void>;
}) {
  async function handleConfirm() {
    await onConfirm(refill.id);
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-border)] bg-white">
      <span className="p-2 rounded-lg bg-[var(--color-surface)] shrink-0">
        <Pill size={16} className="text-[var(--color-action)]" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--color-text)]">{refill.medication_name}</p>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">
          Due: {new Date(refill.next_refill_date).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <RefillUrgencyBadge urgency={refill.urgency} daysUntilDue={refill.days_until_due} />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleConfirm}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
