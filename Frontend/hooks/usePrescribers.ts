import { useState, useCallback } from "react";
import { prescribersApi } from "@/lib/api/prescribers";
import type { PrescriberResponse, PrescriberCreate, PrescriberUpdate } from "@/lib/types";

export function usePrescribers() {
  const [prescribers, setPrescribers] = useState<PrescriberResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (patientId: string, activeOnly = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await prescribersApi.list(patientId, { active_only: activeOnly });
      setPrescribers(data);
    } catch (e: any) {
      setError(e.message || "Failed to load prescribers");
    } finally {
      setLoading(false);
    }
  }, []);

  const add = async (patientId: string, data: PrescriberCreate) => {
    const p = await prescribersApi.create(patientId, data);
    setPrescribers(prev => [...prev, p]);
    return p;
  };

  const update = async (patientId: string, id: string, data: PrescriberUpdate) => {
    const p = await prescribersApi.update(patientId, id, data);
    setPrescribers(prev => prev.map(item => item.id === id ? p : item));
    return p;
  };

  const deactivate = async (patientId: string, id: string) => {
    await prescribersApi.deactivate(patientId, id);
    setPrescribers(prev => prev.map(item => item.id === id ? { ...item, is_active: false } : item));
  };

  return { prescribers, loading, error, fetch, add, update, deactivate };
}
