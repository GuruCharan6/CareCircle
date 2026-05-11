"use client";

import { useState, useCallback } from "react";
import { caregiversApi } from "@/lib/api/caregivers";
import type { CaregiverCreate, CaregiverResponse } from "@/lib/types";

export function useCaregivers() {
  const [caregivers, setCaregivers] = useState<CaregiverResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (patientId: string, activeOnly = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await caregiversApi.list(
        patientId,
        activeOnly ? { active_only: true } : undefined
      );
      setCaregivers(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load caregivers");
    } finally {
      setLoading(false);
    }
  }, []);

  const add = useCallback(async (patientId: string, data: CaregiverCreate) => {
    const cg = await caregiversApi.create(patientId, data);
    setCaregivers(prev => [...prev, cg]);
    return cg;
  }, []);

  const remove = useCallback(async (patientId: string, caregiverId: string) => {
    await caregiversApi.remove(patientId, caregiverId);
    setCaregivers(prev => prev.filter(c => c.id !== caregiverId));
  }, []);

  const reinvite = useCallback(async (patientId: string, caregiverId: string) => {
    await caregiversApi.reinvite(patientId, caregiverId);
  }, []);

  const update = useCallback(async (patientId: string, caregiverId: string, data: CaregiverCreate) => {
    const cg = await caregiversApi.update(patientId, caregiverId, data);
    setCaregivers(prev => prev.map(item => item.id === caregiverId ? cg : item));
    return cg;
  }, []);

  return { caregivers, loading, error, fetch, add, remove, reinvite, update };
}
