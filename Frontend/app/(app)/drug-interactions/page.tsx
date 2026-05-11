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
      await triggerCheck(activePatient.id); // internally fetches after check completes
    }
  };

  if (!activePatient) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <PageHeader 
        title="Drug Interactions" 
        subtitle="AI-detected interactions across all active medications"
      >
        <Button 
          onClick={handleRecheck}
          loading={checking}
          className="bg-[#1D9E75] hover:bg-[#157A5A] text-white font-bold h-10"
        >
          <Search size={18} className="mr-2" />
          Re-check Interactions
        </Button>
      </PageHeader>

      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-44 bg-slate-50 rounded-3xl animate-pulse" />)
        ) : interactions.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[32px] border border-slate-100 shadow-sm">
            <ShieldCheck size={48} className="mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-bold text-[#0D3B6E]">No Interactions Detected</h3>
            <p className="text-slate-500">All active medications appear safe to take together.</p>
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
    <Card className={cn("border-l-4 border-none shadow-sm rounded-2xl overflow-hidden", borderClass)}>
      <div className="p-6 flex items-start gap-6">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-[#0D3B6E]">{interaction.drug_a_generic} ↔ {interaction.drug_b_generic}</h3>
            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest border uppercase", 
              isHigh ? "bg-red-50 text-red-700 border-red-100" : isModerate ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-green-50 text-green-700 border-green-100"
            )}>
              {label}
            </span>
          </div>
          <div className="text-sm space-y-2">
            {interaction.drug_class && <p className="text-slate-400 font-bold"><span className="font-medium">Class:</span> {interaction.drug_class}</p>}
            <p className="text-[#475569]"><span className="font-bold text-[#0D3B6E]">Mechanism:</span> {interaction.mechanism}</p>
            {interaction.recommendation && <p className="text-[#475569]"><span className="font-bold text-[#0D3B6E]">Recommendation:</span> {interaction.recommendation}</p>}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <Icon size={32} className={iconColor} />
          <span className={cn("text-[10px] font-black", iconColor)}>{label}</span>
        </div>
      </div>
    </Card>
  );
}
