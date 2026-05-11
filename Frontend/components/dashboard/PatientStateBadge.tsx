import { Badge } from "@/components/ui/Badge";
import type { PatientStatus } from "@/lib/types";

const CONFIG: Record<PatientStatus, { variant: "ok" | "watch" | "alert"; label: string }> = {
  OK:    { variant: "ok",    label: "All Good" },
  WATCH: { variant: "watch", label: "Watch" },
  ALERT: { variant: "alert", label: "Alert" },
};

interface PatientStateBadgeProps {
  status: PatientStatus;
  className?: string;
}

export function PatientStateBadge({ status, className }: PatientStateBadgeProps) {
  const normalizedStatus = (status?.toUpperCase() || "WATCH") as PatientStatus;
  const { variant, label } = CONFIG[normalizedStatus] || { variant: "watch", label: status || "Unknown" };
  return (
    <Badge variant={variant as any} className={className}>
      {label}
    </Badge>
  );
}
