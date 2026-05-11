"use client";

import { useState, useCallback } from "react";
import { observationsApi } from "@/lib/api/observations";
import type { ObservationCreate, ObservationResponse, ObservationSource } from "@/lib/types";

export function useObservations() {
  const [observations, setObservations] = useState<ObservationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (patientId: string, sourceType?: ObservationSource) => {
    setLoading(true);
    setError(null);
    try {
      const data = await observationsApi.list(
        patientId,
        sourceType ? { source_type: sourceType } : undefined
      );
      setObservations(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load observations");
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (patientId: string, data: ObservationCreate) => {
    const obs = await observationsApi.create(patientId, data);
    setObservations(prev => [obs, ...prev]);
    return obs;
  }, []);

  return { observations, loading, error, fetch, create };
}
