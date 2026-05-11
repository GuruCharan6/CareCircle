"use client";

import { useState, useCallback } from "react";
import { labResultsApi } from "@/lib/api/lab-results";
import type { LabResultResponse, LabTrendItem } from "@/lib/types";

export function useLabResults() {
  const [results, setResults] = useState<LabResultResponse[]>([]);
  const [trend, setTrend] = useState<LabTrendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (patientId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await labResultsApi.list(patientId);
      setResults(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load lab results");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrend = useCallback(async (patientId: string, testName: string) => {
    setTrendLoading(true);
    setTrend([]);
    try {
      const data = await labResultsApi.trend(patientId, testName);
      setTrend(data);
    } catch {
      setTrend([]);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  return { results, trend, loading, trendLoading, error, fetch, fetchTrend };
}
