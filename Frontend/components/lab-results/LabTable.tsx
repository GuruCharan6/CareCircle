"use client";

import { ArrowUp, ArrowDown, Minus, ChevronRight, CheckCircle2, TriangleAlert, AlertCircle, FlaskConical } from "lucide-react";
import type { LabResultResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LabTableProps {
  results: LabResultResponse[];
  onSelect: (result: LabResultResponse) => void;
}

function getStatus(r: LabResultResponse): "OK" | "WATCH" | "ALERT" {
  if (!r.is_abnormal) return "OK";
  const val = Number(r.value);
  const high = r.reference_range_high ? Number(r.reference_range_high) : null;
  return high && val > high * 1.2 ? "ALERT" : "WATCH";
}

const STATUS_CFG = {
  OK:    { color: "#639922", label: "OK",    Icon: CheckCircle2 },
  WATCH: { color: "#EF9F27", label: "WATCH", Icon: TriangleAlert },
  ALERT: { color: "#E24B4A", label: "ALERT", Icon: AlertCircle },
} as const;

export function LabTable({ results, onSelect }: LabTableProps) {
  if (!results.length) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="w-16 h-16 bg-[var(--color-bg)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--color-muted)]">
          <FlaskConical size={32} />
        </div>
        <p className="text-[var(--color-muted)] font-medium">No lab results found.</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile list ──────────────────────────────────── */}
      <div className="lg:hidden bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-[0_1px_3px_rgba(0,0,0,0.08)] divide-y divide-[var(--color-border)] overflow-hidden">
        {results.map(r => {
          const status = getStatus(r);
          const { color, label, Icon } = STATUS_CFG[status];
          const delta = r.delta_from_prev;
          const formattedDate = new Date(r.test_date).toLocaleDateString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
          });
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-[var(--color-bg)]/50 active:bg-[var(--color-bg)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                {/* No truncate — show full test name */}
                <p className="text-sm font-bold text-[var(--color-text)] leading-snug">{r.test_name_display}</p>
                <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{r.lab_name ?? "General Lab"} · {formattedDate}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {/* Value */}
                <div className="text-right">
                  <div className="flex items-baseline gap-0.5 justify-end">
                    <span
                      className="text-base font-bold"
                      style={{ color: r.is_abnormal ? (status === "ALERT" ? "#E24B4A" : "#EF9F27") : "#639922" }}
                    >
                      {r.value}
                    </span>
                    <span className="text-xs text-[var(--color-muted)]">{r.unit}</span>
                  </div>
                  {delta !== null && (
                    <div className={cn(
                      "flex items-center justify-end gap-0.5 text-[11px] font-bold mt-0.5",
                      delta > 0 ? "text-[#E24B4A]" : delta < 0 ? "text-[#639922]" : "text-[var(--color-muted)]"
                    )}>
                      {delta > 0 ? <ArrowUp size={11} strokeWidth={3} /> : delta < 0 ? <ArrowDown size={11} strokeWidth={3} /> : <Minus size={11} />}
                      {Math.abs(delta).toFixed(1)}
                    </div>
                  )}
                </div>
                {/* Status icon 28px */}
                <Icon size={28} style={{ color }} strokeWidth={1.5} />
                <ChevronRight size={14} className="text-[var(--color-muted)] opacity-40" />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Desktop table ─────────────────────────────────── */}
      <div className="hidden lg:block bg-white rounded-2xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
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
              const status = getStatus(r);
              const { color, label, Icon } = STATUS_CFG[status];
              const delta = r.delta_from_prev;
              const deltaVal = delta !== null ? Math.abs(delta).toFixed(1) : "";
              const hasRef = r.reference_range_low !== null || r.reference_range_high !== null;
              const formattedDate = new Date(r.test_date).toLocaleDateString("en-GB", {
                day: "2-digit", month: "short", year: "numeric",
              });

              return (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r)}
                  className="cursor-pointer hover:bg-[var(--color-bg)]/50 transition-all group"
                >
                  <td className="py-5 px-6 min-w-[200px]">
                    <p className="font-bold text-[var(--color-text)] text-[15px]">{r.test_name_display}</p>
                    <p className="text-[11px] text-[var(--color-muted)] font-bold uppercase tracking-tight opacity-70 mt-0.5">
                      {r.test_name.replace(/_/g, " ")}
                    </p>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex items-baseline gap-1">
                      <span className={cn("text-xl font-black", r.is_abnormal ? (status === "ALERT" ? "text-[#E24B4A]" : "text-[#EF9F27]") : "text-[#639922]")}>
                        {r.value}
                      </span>
                      <span className="text-xs font-bold text-[var(--color-muted)]">{r.unit}</span>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <span className="text-sm font-semibold text-[var(--color-muted)]">
                      {hasRef
                        ? `${r.reference_range_low !== null ? r.reference_range_low : ""}${r.reference_range_low !== null && r.reference_range_high !== null ? " - " : ""}${r.reference_range_high !== null ? r.reference_range_high : ""}`
                        : "—"}
                    </span>
                  </td>
                  <td className="py-5 px-6">
                    <p className="text-[13px] font-bold text-[var(--color-text)] opacity-80">{r.lab_name ?? "General Lab"}</p>
                    <p className="text-[11px] font-bold text-[var(--color-muted)]">{formattedDate}</p>
                  </td>
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
                  <td className="py-5 px-6">
                    <div
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border w-fit whitespace-nowrap"
                      style={{ backgroundColor: color + "1A", color, borderColor: color + "33" }}
                    >
                      <Icon size={12} strokeWidth={3} />
                      {label}
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
    </>
  );
}
