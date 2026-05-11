import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

type BadgeVariant = "default" | "primary" | "action" | "alert" | "watch" | "ok" | "muted" | "surface";

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
};

function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
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
