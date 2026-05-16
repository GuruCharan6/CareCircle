"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FlaskConical, ChevronRight, ChevronLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";

const PAGE_SIZE = 4;
import { Card } from "@/components/ui/Card";
import { useLabResults } from "@/hooks/useLabResults";

interface LabSummaryRowProps {
  patientId: string;
}

function DeltaIcon({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta > 0) return <TrendingUp size={11} className="text-red-400" />;
  if (delta < 0) return <TrendingDown size={11} className="text-emerald-500" />;
  return <Minus size={11} className="text-slate-400" />;
}

export function LabSummaryRow({ patientId }: LabSummaryRowProps) {
  const { results, loading, fetch } = useLabResults();
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (patientId) fetch(patientId);
  }, [patientId, fetch]);

  // Deduplicate by test_name — keep most recent per test
  const byTest = results.reduce<Record<string, typeof results[0]>>((acc, r) => {
    const prev = acc[r.test_name];
    if (!prev || new Date(r.test_date) > new Date(prev.test_date)) {
      acc[r.test_name] = r;
    }
    return acc;
  }, {});

  // Merge blood_pressure_systolic + blood_pressure_diastolic → single "Blood Pressure" row
  const systolic = byTest["blood_pressure_systolic"];
  const diastolic = byTest["blood_pressure_diastolic"];
  const mergedRows = Object.values(byTest).filter(
    r => r.test_name !== "blood_pressure_systolic" && r.test_name !== "blood_pressure_diastolic"
  );
  if (systolic || diastolic) {
    const bpDisplay = systolic && diastolic
      ? `${systolic.value}/${diastolic.value}`
      : `${(systolic ?? diastolic!).value}`;
    mergedRows.push({
      ...(systolic ?? diastolic!),
      test_name: "blood_pressure",
      test_name_display: "Blood Pressure",
      value: systolic?.value ?? diastolic!.value,
      unit: "mmHg",
      is_abnormal: (systolic?.is_abnormal || diastolic?.is_abnormal) ?? false,
      delta_from_prev: systolic?.delta_from_prev ?? null,
      _bp_display: bpDisplay,
    } as any);
  }

  const recentByTest = mergedRows
    .sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());

  const totalPages = Math.max(1, Math.ceil(recentByTest.length / PAGE_SIZE));
  const pageResults = recentByTest.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) {
    return (
      <Card title="Lab Results" padding="sm">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-[var(--color-bg)] rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Lab Results"
      padding="none"
      headerAction={
        <Link href="/lab-results" className="text-xs text-[var(--color-action)] font-medium hover:underline flex items-center gap-0.5">
          View all <ChevronRight size={12} />
        </Link>
      }
    >
      <div className="divide-y divide-[var(--color-surface)]">
        {recentByTest.length === 0 ? (
          <div className="px-4 py-8 text-center flex flex-col items-center gap-2">
            <FlaskConical size={28} className="text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-muted)]">No lab results yet</p>
            <p className="text-xs text-[var(--color-muted)]">Upload a lab report to see results here</p>
          </div>
        ) : (
          pageResults.map(r => (
            <div key={r.id} className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-bg)] transition-colors">
              <div className="p-2 rounded-lg bg-[var(--color-surface)]">
                <FlaskConical size={16} className="text-[var(--color-action)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                  {r.test_name_display}
                </p>
                <p className="text-[10px] text-[var(--color-muted)] truncate">
                  {new Date(r.test_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                  {r.is_abnormal && " • Abnormal"}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <DeltaIcon delta={r.delta_from_prev} />
                <span className={`text-sm font-semibold ${r.is_abnormal ? "text-red-600" : "text-[var(--color-text)]"}`}>
                  {(r as any)._bp_display ?? r.value}
                </span>
                {r.unit && <span className="text-[10px] text-[var(--color-muted)]">{r.unit}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--color-surface)]">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[10px] font-semibold text-[var(--color-muted)]">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="p-1 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-30 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </Card>
  );
}
