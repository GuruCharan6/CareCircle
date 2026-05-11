import { AlertTriangle, Clock } from "lucide-react";

interface RefillBadgeProps {
  validUntil: string | null;
}

export function RefillBadge({ validUntil }: RefillBadgeProps) {
  if (!validUntil) return null;

  const daysLeft = Math.ceil(
    (new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft > 14) return null;

  if (daysLeft <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--color-alert)]/10 text-[var(--color-alert)]">
        <AlertTriangle size={10} />
        Expired
      </span>
    );
  }

  if (daysLeft <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--color-alert)]/10 text-[var(--color-alert)]">
        <Clock size={10} />
        {daysLeft}d left
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--color-watch)]/10 text-[var(--color-watch)]">
      <Clock size={10} />
      {daysLeft}d left
    </span>
  );
}
