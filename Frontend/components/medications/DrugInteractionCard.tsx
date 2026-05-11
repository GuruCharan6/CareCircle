import { AlertTriangle, AlertCircle, Info, Ban } from "lucide-react";
import type { DrugInteractionResponse, InteractionSeverity } from "@/lib/types";

const SEVERITY_CONFIG: Record<
  InteractionSeverity,
  { label: string; icon: React.ElementType; bg: string; text: string; border: string }
> = {
  contraindicated: {
    label: "Contraindicated",
    icon: Ban,
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  major: {
    label: "Major",
    icon: AlertTriangle,
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  moderate: {
    label: "Moderate",
    icon: AlertCircle,
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  minor: {
    label: "Minor",
    icon: Info,
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  low: {
    label: "Low",
    icon: Info,
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-200",
  },
};

interface Props {
  interaction: DrugInteractionResponse;
}

export function DrugInteractionCard({ interaction }: Props) {
  const cfg = SEVERITY_CONFIG[interaction.severity];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start gap-2">
        <Icon size={16} className={`mt-0.5 shrink-0 ${cfg.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
            <span className="text-xs font-medium text-[var(--color-text)]">
              {interaction.drug_a_generic} + {interaction.drug_b_generic}
            </span>
          </div>
          <p className="text-xs text-[var(--color-muted)] mt-1">{interaction.mechanism}</p>
          <p className={`text-xs font-medium mt-1 ${cfg.text}`}>{interaction.recommendation}</p>
        </div>
      </div>
    </div>
  );
}
