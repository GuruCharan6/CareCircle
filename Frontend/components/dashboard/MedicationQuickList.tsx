"use client";

import Link from "next/link";
import { Pill, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { MedicationResponse } from "@/lib/types";

interface MedicationQuickListProps {
  medications: MedicationResponse[];
  loading?: boolean;
}

export function MedicationQuickList({ medications, loading }: MedicationQuickListProps) {
  if (loading) {
    return (
      <Card title="Active Medications" padding="sm">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-[var(--color-bg)] rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  const activeMeds = medications.filter(m => m.status === "active").slice(0, 4);

  return (
    <Card 
      title="Active Medications" 
      padding="none"
      headerAction={
        <Link href="/medications" className="text-xs text-[var(--color-action)] font-medium hover:underline flex items-center gap-0.5">
          View all <ChevronRight size={12} />
        </Link>
      }
    >
      <div className="divide-y divide-[var(--color-surface)]">
        {activeMeds.length > 0 ? (
          activeMeds.map((med) => (
            <div key={med.id} className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-bg)] transition-colors">
              <div className="p-2 rounded-lg bg-[var(--color-surface)]">
                <Pill size={16} className="text-[var(--color-action)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                  {med.brand_name || med.generic_name}
                </p>
                <p className="text-[10px] text-[var(--color-muted)] truncate">
                  {[med.dose, med.frequency].filter(Boolean).join(" • ")}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[var(--color-muted)]">No active medications found.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
