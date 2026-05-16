import Link from "next/link";
import { useEffect } from "react";
import { FlaskConical, ChevronRight, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLabResults } from "@/hooks/useLabResults";

interface LabSummaryRowProps {
  patientId: string;
}

function StatusDot({ abnormal }: { abnormal: boolean }) {
  return (
    <span
      className={`w-2 h-2 rounded-full shrink-0 ${abnormal ? "bg-red-500" : "bg-emerald-500"}`}
    />
  );
}

function DeltaIcon({ delta }: { delta: number | null }) {
  if (delta === null) return <Minus size={12} className="text-slate-400" />;
  if (delta > 0) return <TrendingUp size={12} className="text-red-400" />;
  if (delta < 0) return <TrendingDown size={12} className="text-emerald-500" />;
  return <Minus size={12} className="text-slate-400" />;
}

export function LabSummaryRow({ patientId }: LabSummaryRowProps) {
  const { results, loading, fetch } = useLabResults();

  useEffect(() => {
    if (patientId) fetch(patientId);
  }, [patientId, fetch]);

  // Deduplicate by test_name — keep most recent per test
  const recentByTest = Object.values(
    results.reduce<Record<string, typeof results[0]>>((acc, r) => {
      const prev = acc[r.test_name];
      if (!prev || new Date(r.test_date) > new Date(prev.test_date)) {
        acc[r.test_name] = r;
      }
      return acc;
    }, {})
  )
    .sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())
    .slice(0, 5);

  return (
    <Card className="border-0 shadow-lg overflow-hidden bg-white/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
            <FlaskConical size={18} />
          </div>
          <CardTitle className="text-[16px] font-bold text-[#0D3B6E]">Lab Results</CardTitle>
        </div>
        <Link
          href="/lab-results"
          className="flex items-center gap-1 text-xs text-[var(--color-action)] font-semibold hover:underline"
        >
          View all <ChevronRight size={13} />
        </Link>
      </CardHeader>

      <div className="px-4 lg:px-6 pb-4 lg:pb-6 space-y-2 max-h-[272px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : recentByTest.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <FlaskConical size={28} className="text-slate-300" />
            <p className="text-[13px] font-medium text-slate-400">No lab results yet</p>
            <p className="text-[11px] text-slate-400">Upload a lab report to see results here</p>
          </div>
        ) : (
          recentByTest.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-xl bg-white border border-slate-100 px-3 py-2.5 shadow-sm"
            >
              <StatusDot abnormal={r.is_abnormal} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-[#0D3B6E] truncate">{r.test_name_display}</p>
                <p className="text-[11px] text-slate-400">
                  {new Date(r.test_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <DeltaIcon delta={r.delta_from_prev} />
                <span className={`text-[13px] font-bold ${r.is_abnormal ? "text-red-600" : "text-emerald-700"}`}>
                  {r.value}
                </span>
                {r.unit && <span className="text-[10px] text-slate-400">{r.unit}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
