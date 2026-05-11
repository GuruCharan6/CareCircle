"use client";

import { useState, useCallback } from "react";
import { medicationsApi } from "@/lib/api/medications";
import type { MedicationCreate, MedicationUpdate, MedicationResponse } from "@/lib/types";

const cache: Record<string, MedicationResponse[]> = {};

export function useMedications() {
  const [medications, setMedications] = useState<MedicationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (patientId: string, activeOnly = false) => {
    // If we have cached data, set it immediately for instant UI
    if (cache[patientId]) {
      setMedications(cache[patientId]);
    }

    setLoading(true);
    setError(null);
    try {
      const data = await medicationsApi.list(
        patientId,
        activeOnly ? { active_only: true } : undefined
      );
      setMedications(data);
      cache[patientId] = data; // Update cache
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load medications");
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (patientId: string, data: MedicationCreate) => {
    const med = await medicationsApi.create(patientId, data);
    setMedications(prev => {
      const next = [...prev, med];
      cache[patientId] = next;
      return next;
    });
    return med;
  }, []);

  const update = useCallback(async (patientId: string, medId: string, data: MedicationUpdate) => {
    const updated = await medicationsApi.update(patientId, medId, data);
    setMedications(prev => {
      const next = prev.map(m => m.id === medId ? updated : m);
      cache[patientId] = next;
      return next;
    });
    return updated;
  }, []);

  const discontinue = useCallback(async (patientId: string, medId: string) => {
    await medicationsApi.discontinue(patientId, medId);
    setMedications(prev => {
      const next = prev.filter(m => m.id !== medId);
      cache[patientId] = next;
      return next;
    });
  }, []);

  return { medications, loading, error, fetch, create, update, discontinue };
}
