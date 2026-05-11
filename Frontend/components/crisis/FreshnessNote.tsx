import { Clock, AlertCircle } from "lucide-react";

interface Props {
  note: string;
  isCurrent: boolean;
}

export function FreshnessNote({ note, isCurrent }: Props) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--color-muted)] uppercase tracking-wider">
        <Clock size={12} />
        <span>Data Status</span>
      </div>
      <p className={`text-xs ${isCurrent ? "text-[var(--color-ok)]" : "text-amber-600 flex items-center gap-1"}`}>
        {!isCurrent && <AlertCircle size={12} />}
        {note}
      </p>
    </div>
  );
}
