"use client";

import { useState, useCallback } from "react";
import { refillsApi } from "@/lib/api/refills";
import type { RefillCreate, RefillResponse, RefillStatusResponse } from "@/lib/types";

export function useRefills() {
  const [dueRefills, setDueRefills] = useState<RefillStatusResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDue = useCallback(async (patientId: string, withinDays = 10) => {
    setLoading(true);
    setError(null);
    try {
      const data = await refillsApi.listDue(patientId, { within_days: withinDays });
      setDueRefills(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load refills");
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (patientId: string, data: RefillCreate): Promise<RefillResponse> => {
    return refillsApi.create(patientId, data);
  }, []);

  const confirm = useCallback(async (patientId: string, refillId: string) => {
    await refillsApi.confirm(patientId, refillId);
    setDueRefills(prev => prev.filter(r => r.id !== refillId));
  }, []);

  return { dueRefills, loading, error, fetchDue, create, confirm };
}
