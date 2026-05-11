import type { LabResultResponse } from "@/lib/types";
import { Beaker } from "lucide-react";

interface Props {
  results: LabResultResponse[];
}

export function CrisisLabList({ results }: Props) {
  if (!results || results.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">
        Recent Lab Results
      </h4>
      <div className="space-y-1.5">
        {results.map((res, i) => (
          <div
            key={i}
            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 border ${
              res.is_abnormal 
                ? "bg-red-50 border-red-100 text-red-900" 
                : "bg-white border-[var(--color-border)] text-[var(--color-text)]"
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {res.test_name_display || res.test_name}
              </p>
              <p className="text-xs opacity-70">
                {res.test_date} {res.lab_name ? `· ${res.lab_name}` : ""}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold">
                {res.value} <span className="text-[10px] font-normal">{res.unit}</span>
                {res.is_abnormal && <span className="ml-1 text-[var(--color-alert)]">↑</span>}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
