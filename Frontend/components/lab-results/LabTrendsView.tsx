"use client";

import { useLabResults } from "@/hooks/useLabResults";
import { Card } from "@/components/ui/Card";
import { LabTrendChart } from "./LabTrendChart";
import type { LabResultResponse } from "@/lib/types";
import { useEffect, useState } from "react";

interface Props {
  patientId: string;
  results: LabResultResponse[];
}

export function LabTrendsView({ patientId, results }: Props) {
  const { trend, trendLoading, fetchTrend } = useLabResults();
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  // Group results by test name to show available trends
  const uniqueTests = Array.from(new Set(results.map(r => r.test_name_display)));

  useEffect(() => {
    if (uniqueTests.length > 0 && !selectedTest) {
      const firstTest = results.find(r => r.test_name_display === uniqueTests[0])?.test_name;
      if (firstTest) {
        setSelectedTest(firstTest);
        fetchTrend(patientId, firstTest);
      }
    }
  }, [uniqueTests, selectedTest, patientId, fetchTrend, results]);

  const handleTestSelect = (testName: string) => {
    setSelectedTest(testName);
    fetchTrend(patientId, testName);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {uniqueTests.map(test => {
          const testSlug = results.find(r => r.test_name_display === test)?.test_name;
          return (
            <button
              key={test}
              onClick={() => testSlug && handleTestSelect(testSlug)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                selectedTest === testSlug
                  ? "bg-[#0D3B6E] text-white border-[#0D3B6E]"
                  : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
              }`}
            >
              {test}
            </button>
          );
        })}
      </div>

      <Card className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-black text-[#0D3B6E]">
              {results.find(r => r.test_name === selectedTest)?.test_name_display || "Select a test"}
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Historical Performance</p>
          </div>
        </div>
        
        <div className="h-[300px] flex items-end">
          <LabTrendChart data={trend} loading={trendLoading} />
        </div>
      </Card>
    </div>
  );
}
