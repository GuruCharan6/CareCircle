"use client";

import { useEffect } from "react";
import { Search, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePatient } from "@/hooks/usePatient";
import { useDrugInteractions } from "@/hooks/useDrugInteractions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import type { DrugInteractionResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function DrugInteractionsPage() {
  const { activePatient } = usePatient();
  const { interactions, loading, checking, fetch, triggerCheck } = useDrugInteractions();

  useEffect(() => {
    if (activePatient) fetch(activePatient.id);
  }, [activePatient?.id, fetch]);

  const handleRecheck = async () => {
    if (activePatient) {
      await triggerCheck(activePatient.id);
    }
  };

  if (!activePatient) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Page heading */}
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-primary)]">Drug Interactions</h1>
        <p className="text-sm text-[var(--color-muted)] mt-0.5">
          AI-detected interactions across all active medications
        </p>
      </div>

      {/* Re-check button — full width on mobile */}
      <Button
        onClick={handleRecheck}
        loading={checking}
        className="w-full h-12 rounded-xl bg-[#1D9E75] hover:bg-[#157A5A] text-white font-bold flex items-center justify-center gap-2"
      >
        <Search size={18} />
        Re-check Interactions
      </Button>

      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-44 bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-[0_1px_3px_rgba(0,0,0,0.08)] animate-pulse" />)
        ) : interactions.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <ShieldCheck size={48} className="mx-auto mb-4 text-green-500" />
            <h3 className="text-lg lg:text-xl font-bold text-[#0D3B6E]">No Interactions Detected</h3>
            <p className="text-slate-500 mt-1">All active medications appear safe to take together.</p>
          </div>
        ) : (
          interactions.map(ix => <InteractionCard key={ix.id} interaction={ix} />)
        )}
      </div>
    </div>
  );
}

function InteractionCard({ interaction }: { interaction: DrugInteractionResponse }) {
  const severity = (interaction.severity || interaction.final_urgency || 'low').toLowerCase();
  const isHigh = ['high', 'major', 'alert', 'contraindicated'].includes(severity);
  const isModerate = ['moderate', 'watch'].includes(severity);

  let borderClass = "border-l-green-500";
  let label = "LOW";
  let Icon = CheckCircle2;
  let iconColor = "text-green-500";

  if (isHigh) {
    borderClass = "border-l-red-500";
    label = "CRITICAL";
    Icon = AlertTriangle;
    iconColor = "text-red-500";
  } else if (isModerate) {
    borderClass = "border-l-amber-500";
    label = "MODERATE";
    Icon = AlertTriangle;
    iconColor = "text-amber-500";
  }

  return (
    <Card className={cn("border-l-4 border-none shadow-sm overflow-hidden", borderClass)}>
      <div className="p-4 sm:p-5">
        {/* Header row: drug names + icon (icon confined here, not stealing width below) */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[#0D3B6E] leading-snug">
              {interaction.drug_a_generic} ↔ {interaction.drug_b_generic}
            </h3>
            <div className="mt-1.5">
              <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                isHigh ? "bg-red-50 text-red-700 border-red-100" : isModerate ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-green-50 text-green-700 border-green-100"
              )}>
                {label}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <Icon size={36} className={iconColor} strokeWidth={1.5} />
            <span className={cn("text-[10px] font-black", iconColor)}>{label}</span>
          </div>
        </div>

        {/* Full-width content below header */}
        <div className="space-y-2">
          {interaction.drug_class && (
            <p className="text-sm text-slate-400"><span className="font-medium text-slate-500">Class:</span> {interaction.drug_class}</p>
          )}
          <div>
            <p className="text-sm font-semibold text-[var(--color-primary)]">Mechanism</p>
            <p className="text-sm text-[var(--color-muted)] mt-1 leading-relaxed">{interaction.mechanism}</p>
          </div>
          {interaction.recommendation && (
            <div>
              <p className="text-sm font-semibold text-[var(--color-primary)]">Recommendation</p>
              <p className="text-sm text-[var(--color-muted)] mt-1 leading-relaxed">{interaction.recommendation}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
