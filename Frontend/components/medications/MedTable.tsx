"use client";

import { useState } from "react";
import type { MedicationResponse, DrugInteractionResponse } from "@/lib/types";
import { TriangleAlert, Edit2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

interface MedTableProps {
  medications: MedicationResponse[];
  interactions: DrugInteractionResponse[];
  onEdit: (med: MedicationResponse) => void;
  onDiscontinue: (med: MedicationResponse) => void;
}

function hasInteraction(med: MedicationResponse, interactions: DrugInteractionResponse[]): boolean {
  const name = med.generic_name?.toLowerCase() ?? "";
  return interactions.some(
    ix => ix.drug_a_generic?.toLowerCase() === name || ix.drug_b_generic?.toLowerCase() === name
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ med, interactionFlag }: { med: MedicationResponse; interactionFlag: boolean }) {
  if (interactionFlag) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EF9F27]/10 text-[#EF9F27] border border-[#EF9F27]/25 whitespace-nowrap">
        <TriangleAlert size={11} /> interaction
      </span>
    );
  }
  if (med.status === "active") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#639922]/10 text-[#639922] border border-[#639922]/25 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-[#639922]" /> active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> {med.status}
    </span>
  );
}

export function MedTable({ medications, interactions, onEdit, onDiscontinue }: MedTableProps) {
  const [pendingDiscontinue, setPendingDiscontinue] = useState<MedicationResponse | null>(null);

  if (!medications.length) {
    return (
      <div className="text-center py-16 text-[var(--color-muted)] text-sm">
        No medications found.
      </div>
    );
  }

  return (
    <>
      {/* ── Discontinue confirm dialog ────────────────────── */}
      {pendingDiscontinue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h2 className="text-base font-bold text-[var(--color-text)]">Stop this medication?</h2>
            <p className="text-sm text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-text)]">{pendingDiscontinue.generic_name}</span> will be marked as discontinued. This cannot be undone from this screen.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingDiscontinue(null)}
                className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-semibold text-[var(--color-muted)] hover:bg-[var(--color-bg)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDiscontinue(pendingDiscontinue); setPendingDiscontinue(null); }}
                className="px-4 py-2 rounded-lg bg-[var(--color-alert)] hover:bg-[var(--color-alert)]/90 text-white text-sm font-semibold transition-colors"
              >
                Yes, discontinue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile card list ─────────────────────────────── */}
      <div className="lg:hidden space-y-2">
        {medications.map(med => {
          const interactionFlag = hasInteraction(med, interactions);
          const isActive = med.status === "active";
          return (
            <Card key={med.id} padding="none" className="relative">
              <div className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-base font-semibold text-[var(--color-text)] leading-snug">{med.generic_name}</p>
                    <StatusBadge med={med} interactionFlag={interactionFlag} />
                  </div>
                  {(med.brand_name || med.drug_class) && (
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                      {[med.brand_name, med.drug_class].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {(med.dose || med.frequency) && (
                    <p className="text-sm text-[var(--color-text)]">
                      {[med.dose, med.frequency].filter(Boolean).join(" · ")}
                      {med.timing && (
                        <span className="text-[var(--color-action)] font-medium ml-1">· {med.timing}</span>
                      )}
                    </p>
                  )}
                  {med.prescriber_name && (
                    <p className="text-xs text-[var(--color-muted)] mt-1">
                      Dr. {med.prescriber_name.replace(/^Dr\.\s*/i, "")}
                    </p>
                  )}
                  {med.valid_until && (
                    <p className="text-[11px] text-[var(--color-muted)]">Valid until {formatDate(med.valid_until)}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => onEdit(med)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-bg)] active:scale-95 transition-all"
                  >
                    <Edit2 size={14} />
                  </button>
                  {isActive && (
                    <button
                      onClick={() => setPendingDiscontinue(med)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--color-alert)]/10 text-[var(--color-alert)] hover:bg-[var(--color-alert)]/20 active:scale-95 transition-all"
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Desktop table ─────────────────────────────────── */}
      <div className="hidden lg:block bg-white rounded-2xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
              {["MEDICATION", "DOSE & FREQUENCY", "PRESCRIBER", "VALID UNTIL", "STATUS", "ACTIONS"].map(col => (
                <th
                  key={col}
                  className="px-5 py-3 text-left text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {medications.map(med => {
              const interactionFlag = hasInteraction(med, interactions);
              const isActive = med.status === "active";
              return (
                <tr key={med.id} className="hover:bg-[var(--color-bg)]/50 transition-colors">
                  <td className="px-5 py-4 align-middle">
                    <p className="font-bold text-[var(--color-text)]">{med.generic_name}</p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                      {[med.brand_name, med.drug_class].filter(Boolean).join(" · ")}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <p className="font-semibold text-[var(--color-text)]">
                      {[med.dose, med.frequency].filter(Boolean).join(" · ")}
                    </p>
                    {med.timing && (
                      <p className="text-xs text-[var(--color-action)] mt-0.5">{med.timing}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 align-middle">
                    {med.prescriber_name ? (
                      <>
                        <p className="font-semibold text-[var(--color-text)]">
                          {med.prescriber_name.match(/^Dr\./i) ? med.prescriber_name : `Dr. ${med.prescriber_name}`}
                        </p>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">
                          {[med.prescriber_specialty, med.prescriber_hospital].filter(Boolean).join(" · ")}
                        </p>
                      </>
                    ) : (
                      <span className="text-[var(--color-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 align-middle text-sm text-[var(--color-text)] whitespace-nowrap">
                    {formatDate(med.valid_until)}
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <StatusBadge med={med} interactionFlag={interactionFlag} />
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(med)}
                        className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-bg)] transition-colors"
                      >
                        Edit
                      </button>
                      {isActive && (
                        <button
                          onClick={() => setPendingDiscontinue(med)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--color-alert)] hover:bg-[var(--color-alert)]/90 text-white text-xs font-semibold transition-colors"
                        >
                          Discontinue
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
