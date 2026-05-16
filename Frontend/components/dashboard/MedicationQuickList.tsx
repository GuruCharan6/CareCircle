"use client";

import Link from "next/link";
import { useState } from "react";
import { Pill, ChevronRight, ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { MedicationResponse } from "@/lib/types";

const PAGE_SIZE = 4;

interface MedicationQuickListProps {
  medications: MedicationResponse[];
  loading?: boolean;
}

export function MedicationQuickList({ medications, loading }: MedicationQuickListProps) {
  const [page, setPage] = useState(0);

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

  const activeMeds = medications.filter(m => m.status === "active");
  const totalPages = Math.max(1, Math.ceil(activeMeds.length / PAGE_SIZE));
  const pageMeds = activeMeds.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
        {pageMeds.length > 0 ? (
          pageMeds.map((med) => (
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--color-surface)]">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[10px] font-semibold text-[var(--color-muted)]">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="p-1 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-30 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </Card>
  );
}
