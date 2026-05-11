import { AlertTriangle, Clock, Calendar } from "lucide-react";

type Urgency = "critical" | "soon" | "upcoming";

const CONFIG: Record<Urgency, { icon: typeof Clock; cls: string; label: string }> = {
  critical: { icon: AlertTriangle, cls: "bg-[var(--color-alert)]/15 text-[var(--color-alert)]",  label: "Critical" },
  soon:     { icon: Clock,         cls: "bg-[var(--color-watch)]/15 text-[var(--color-watch)]",   label: "Soon" },
  upcoming: { icon: Calendar,      cls: "bg-[var(--color-ok)]/15 text-[var(--color-ok)]",         label: "Upcoming" },
};

interface RefillUrgencyBadgeProps {
  urgency: Urgency;
  daysUntilDue: number;
  className?: string;
}

export function RefillUrgencyBadge({ urgency, daysUntilDue, className = "" }: RefillUrgencyBadgeProps) {
  const { icon: Icon, cls, label } = CONFIG[urgency];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls} ${className}`}>
      <Icon size={11} />
      {daysUntilDue <= 0 ? "Due now" : `${label} · ${daysUntilDue}d`}
    </span>
  );
}
