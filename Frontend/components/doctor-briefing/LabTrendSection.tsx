import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import type { DoctorBriefingResponse } from "@/lib/api/doctor-briefing";

type TrendItem = DoctorBriefingResponse["lab_trends"][number];

const DIRECTION_CONFIG = {
  improving: { icon: TrendingUp,   color: "text-[var(--color-ok)]",    label: "Improving" },
  worsening: { icon: TrendingDown, color: "text-[var(--color-alert)]", label: "Worsening" },
  stable:    { icon: Minus,        color: "text-[var(--color-muted)]", label: "Stable" },
};

interface Props {
  trends: TrendItem[];
}

export function LabTrendSection({ trends }: Props) {
  if (!trends?.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[var(--color-primary)]">Lab Trends</h3>
      <div className="space-y-2">
        {trends.map((t, i) => {
          const cfg = DIRECTION_CONFIG[t.direction];
          const Icon = cfg.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-3 bg-[var(--color-surface)] rounded-lg px-3 py-2"
            >
              <Icon size={16} className={`shrink-0 ${cfg.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)] truncate">
                  {t.test_name_display}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {t.latest_value} {t.unit} · {cfg.label}
                </p>
              </div>
              {t.is_abnormal && (
                <AlertCircle size={14} className="text-[var(--color-alert)] shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
