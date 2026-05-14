import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

type BadgeVariant =
  | "default"
  | "primary"
  | "action"
  | "alert"
  | "watch"
  | "ok"
  | "muted"
  | "surface"
  | "active"
  | "warning"
  | "error"
  | "approved";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:  "bg-gray-100 text-gray-700",
  primary:  "bg-[var(--color-primary)] text-white",
  action:   "bg-[var(--color-action)] text-white",
  alert:    "bg-[var(--color-alert)] text-white",
  watch:    "bg-[var(--color-watch)] text-white",
  ok:       "bg-[var(--color-ok)] text-white",
  muted:    "bg-[var(--color-border)] text-[var(--color-muted)]",
  surface:  "bg-[var(--color-surface)] text-[var(--color-primary)]",
  /* semantic convenience variants */
  active:   "bg-[var(--color-ok)]/10 text-[var(--color-ok)] border border-[var(--color-ok)]/25",
  warning:  "bg-[var(--color-watch)]/10 text-[var(--color-watch)] border border-[var(--color-watch)]/25",
  error:    "bg-[var(--color-alert)]/10 text-[var(--color-alert)] border border-[var(--color-alert)]/25",
  approved: "bg-transparent text-[var(--color-ok)] border border-[var(--color-ok)]/40",
};

function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge };
