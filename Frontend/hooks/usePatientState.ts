"use client";

import { useState, useCallback } from "react";
import { patientStateApi } from "@/lib/api/patient-state";
import type { PatientStateResponse } from "@/lib/types";

const cache: Record<string, PatientStateResponse> = {};

export function usePatientState() {
  const [state, setState] = useState<PatientStateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (patientId: string) => {
    if (cache[patientId]) {
      setState(cache[patientId]);
    }

    setLoading(true);
    setError(null);
    try {
      const data = await patientStateApi.get(patientId);
      setState(data);
      cache[patientId] = data;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load patient state");
    } finally {
      setLoading(false);
    }
  }, []);

  return { state, loading, error, fetch };
}
