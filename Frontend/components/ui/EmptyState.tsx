import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-14 text-center", className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] flex items-center justify-center mb-4">
          <Icon size={22} className="text-[var(--color-muted)]" />
        </div>
      )}
      <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
      {description && (
        <p className="text-xs text-[var(--color-muted)] mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
