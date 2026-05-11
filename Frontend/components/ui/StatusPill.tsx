import { cn } from "@/lib/utils";
import type { PatientStatus } from "@/lib/types";

interface StatusPillProps {
  status: PatientStatus;
  className?: string;
}

const config: Record<PatientStatus, { label: string; classes: string }> = {
  OK:    { label: "OK",    classes: "bg-[var(--color-ok)] text-white" },
  WATCH: { label: "WATCH", classes: "bg-[var(--color-watch)] text-white" },
  ALERT: { label: "ALERT", classes: "bg-[var(--color-alert)] text-white" },
};

function StatusPill({ status, className }: StatusPillProps) {
  const { label, classes } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase",
        classes,
        className
      )}
    >
      {label}
    </span>
  );
}

export { StatusPill };
