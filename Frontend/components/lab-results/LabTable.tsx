"use client";

import { ArrowUp, ArrowDown, Minus, ChevronRight, CheckCircle2, TriangleAlert, AlertCircle, FlaskConical } from "lucide-react";
import type { LabResultResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LabTableProps {
  results: LabResultResponse[];
  onSelect: (result: LabResultResponse) => void;
}

export function LabTable({ results, onSelect }: LabTableProps) {
  if (!results.length) {
    return (
      <div className="text-center py-20 bg-white">
        <div className="w-16 h-16 bg-[var(--color-bg)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--color-muted)]">
          <FlaskConical size={32} />
        </div>
        <p className="text-[var(--color-muted)] font-medium">No lab results found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
            {["Test", "Value", "Reference Range", "Lab / Date", "Δ Prev", "Status", ""].map(h => (
              <th key={h} className="py-4 px-6 text-left text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {results.map(r => {
            const delta = r.delta_from_prev;
            const deltaVal = delta !== null ? Math.abs(delta).toFixed(1) : "";
            
            let status: "OK" | "WATCH" | "ALERT" = "OK";
            if (r.is_abnormal) {
              const val = Number(r.value);
              const high = r.reference_range_high ? Number(r.reference_range_high) : null;
              status = (high && val > high * 1.2) ? "ALERT" : "WATCH";
            }

            const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
              OK:    { color: "#639922", bg: "#639922/10", icon: CheckCircle2 },
              WATCH: { color: "#EF9F27", bg: "#EF9F27/10", icon: TriangleAlert },
              ALERT: { color: "#E24B4A", bg: "#E24B4A/10", icon: AlertCircle },
            };
            const cfg = statusConfig[status];
            const StatusIcon = cfg.icon;

            const hasRef = r.reference_range_low !== null || r.reference_range_high !== null;
            const formattedDate = new Date(r.test_date).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });

            return (
              <tr
                key={r.id}
                onClick={() => onSelect(r)}
                className="cursor-pointer hover:bg-[var(--color-bg)]/50 transition-all group"
              >
                {/* TEST */}
                <td className="py-5 px-6 min-w-[200px]">
                  <p className="font-bold text-[var(--color-text)] text-[15px]">{r.test_name_display}</p>
                  <p className="text-[11px] text-[var(--color-muted)] font-bold uppercase tracking-tight opacity-70 mt-0.5">
                    {r.test_name.replace(/_/g, ' ')}
                  </p>
                </td>

                {/* VALUE */}
                <td className="py-5 px-6">
                  <div className="flex items-baseline gap-1">
                    <span className={cn("text-xl font-black", r.is_abnormal ? (status === "ALERT" ? "text-[#E24B4A]" : "text-[#EF9F27]") : "text-[#639922]")}>
                      {r.value}
                    </span>
                    <span className="text-xs font-bold text-[var(--color-muted)]">{r.unit}</span>
                  </div>
                </td>

                {/* REFERENCE RANGE */}
                <td className="py-5 px-6">
                  <span className="text-sm font-semibold text-[var(--color-muted)]">
                    {hasRef
                      ? `${r.reference_range_low !== null ? r.reference_range_low : ""}${r.reference_range_low !== null && r.reference_range_high !== null ? " - " : ""}${r.reference_range_high !== null ? r.reference_range_high : ""}`
                      : "—"}
                  </span>
                </td>

                {/* LAB / DATE */}
                <td className="py-5 px-6">
                  <p className="text-[13px] font-bold text-[var(--color-text)] opacity-80">{r.lab_name ?? "General Lab"}</p>
                  <p className="text-[11px] font-bold text-[var(--color-muted)]">{formattedDate}</p>
                </td>

                {/* DELTA PREV */}
                <td className="py-5 px-6">
                  {delta !== null ? (
                    <div className={cn(
                      "flex items-center gap-0.5 text-[13px] font-bold",
                      delta > 0 ? "text-[#E24B4A]" : delta < 0 ? "text-[#639922]" : "text-[var(--color-muted)]"
                    )}>
                      {delta > 0 ? <ArrowUp size={14} strokeWidth={3} /> : delta < 0 ? <ArrowDown size={14} strokeWidth={3} /> : <Minus size={14} />}
                      {deltaVal}
                    </div>
                  ) : (
                    <span className="text-[var(--color-muted)] opacity-30">—</span>
                  )}
                </td>

                {/* STATUS */}
                <td className="py-5 px-6">
                  <div 
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border w-fit whitespace-nowrap"
                    style={{ 
                      backgroundColor: cfg.color + "1A", // 10% opacity hex
                      color: cfg.color,
                      borderColor: cfg.color + "33" // 20% opacity hex
                    }}
                  >
                    <StatusIcon size={12} strokeWidth={3} />
                    {status}
                  </div>
                </td>

                <td className="py-5 px-6 text-[var(--color-muted)] opacity-30 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={18} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

