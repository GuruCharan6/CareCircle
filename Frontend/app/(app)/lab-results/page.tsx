"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Download } from "lucide-react";
import { usePatient } from "@/hooks/usePatient";
import { useLabResults } from "@/hooks/useLabResults";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LabTable } from "@/components/lab-results/LabTable";
import { LabTrendsView } from "@/components/lab-results/LabTrendsView";
import { LabModal } from "@/components/lab-results/LabModal";
import type { LabResultResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "all" | "abnormal" | "trends";

export default function LabResultsPage() {
  const { activePatient } = usePatient();
  const {
    results, loading, error, fetch,
    trend, trendLoading, fetchTrend
  } = useLabResults();

  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [selectedResult, setSelectedResult] = useState<LabResultResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (activePatient) fetch(activePatient.id);
  }, [activePatient, fetch]);

  const handleSelect = useCallback((result: LabResultResponse) => {
    setSelectedResult(result);
    setModalOpen(true);
  }, []);

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedResult(null);
  };

  if (!activePatient) return null;

  const filtered = results.filter(r => activeTab === "abnormal" ? r.is_abnormal : true);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Page heading */}
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-primary)]">Lab Results</h1>
        <p className="text-sm text-[var(--color-muted)] mt-0.5">
          Pathology tests and analysis for {activePatient.name}
        </p>
      </div>

      {/* Tab bar + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Pill-style tabs */}
        <div className="flex gap-1 bg-[var(--color-surface)] rounded-xl p-1 w-fit">
          {(["all", "abnormal", "trends"] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-150 whitespace-nowrap",
                activeTab === t
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
              )}
            >
              {t === "all" ? "All Results" : t === "abnormal" ? "Abnormal" : "Trends"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button className="h-10 px-4 rounded-xl border border-[var(--color-border)] flex items-center gap-2 text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
            <Download size={16} />
            Export PDF
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-[var(--color-action)] hover:bg-[var(--color-action)]/90 text-white flex items-center gap-2 text-sm font-bold transition-colors"
          >
            <Plus size={16} />
            Add Result
          </button>
        </div>
      </div>

      {activeTab === "trends" ? (
        <LabTrendsView patientId={activePatient.id} results={results} />
      ) : (
        <LabTable results={filtered} onSelect={handleSelect} />
      )}

      <LabModal
        open={modalOpen}
        onClose={handleCloseModal}
        result={selectedResult}
        trend={trend}
        trendLoading={trendLoading}
        onFetchTrend={(testName) => fetchTrend(activePatient.id, testName)}
      />
    </div>
  );
}
