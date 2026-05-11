import { useState, useCallback } from "react";
import { historyApi } from "@/lib/api/history";

export function useHistory() {
  const [history, setHistory] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (patientId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await historyApi.get(patientId);
      setHistory(data);
    } catch (e: any) {
      setError(e.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  const getPdfUrl = async (patientId: string) => {
    try {
      const { url } = await historyApi.getPdfUrl(patientId);
      return url;
    } catch (e) {
      console.error("Failed to get history PDF", e);
      return null;
    }
  };

  return { history, loading, error, fetch, getPdfUrl };
}
