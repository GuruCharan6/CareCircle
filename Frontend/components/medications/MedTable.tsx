"use client";

import type { MedicationResponse, DrugInteractionResponse } from "@/lib/types";
import { TriangleAlert } from "lucide-react";

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

export function MedTable({ medications, interactions, onEdit, onDiscontinue }: MedTableProps) {
  if (!medications.length) {
    return (
      <div className="text-center py-16 text-[var(--color-muted)] text-sm">
        No medications found.
      </div>
    );
  }

  return (
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
              {/* MEDICATION */}
              <td className="px-5 py-4 align-middle">
                <p className="font-bold text-[var(--color-text)]">{med.generic_name}</p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  {[med.brand_name, med.drug_class].filter(Boolean).join(" · ")}
                </p>
              </td>

              {/* DOSE & FREQUENCY */}
              <td className="px-5 py-4 align-middle">
                <p className="font-semibold text-[var(--color-text)]">
                  {[med.dose, med.frequency].filter(Boolean).join(" · ")}
                </p>
                {med.timing && (
                  <p className="text-xs text-[var(--color-action)] mt-0.5">{med.timing}</p>
                )}
              </td>

              {/* PRESCRIBER */}
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

              {/* VALID UNTIL */}
              <td className="px-5 py-4 align-middle text-sm text-[var(--color-text)] whitespace-nowrap">
                {formatDate(med.valid_until)}
              </td>

              {/* STATUS */}
              <td className="px-5 py-4 align-middle">
                {interactionFlag ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EF9F27]/10 text-[#EF9F27] border border-[#EF9F27]/20 whitespace-nowrap">
                    <TriangleAlert size={12} />
                    interaction
                  </span>
                ) : med.status === "active" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#639922]/10 text-[#639922] border border-[#639922]/20 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#639922]" />
                    active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    {med.status}
                  </span>
                )}
              </td>

              {/* ACTIONS */}
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
                      onClick={() => onDiscontinue(med)}
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
  );
}
