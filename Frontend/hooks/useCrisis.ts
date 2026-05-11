"use client";

import { useState, useCallback } from "react";
import { crisisApi } from "@/lib/api/crisis";
import type { CrisisPacketResponse, CrisisTrigger } from "@/lib/types";

export function useCrisis() {
  const [packet, setPacket] = useState<CrisisPacketResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPacket = useCallback(async (patientId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await crisisApi.get(patientId);
      setPacket(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load crisis packet");
    } finally {
      setLoading(false);
    }
  }, []);

  const enter = useCallback(async (patientId: string, trigger: CrisisTrigger = "button_tap") => {
    setLoading(true);
    setError(null);
    try {
      const data = await crisisApi.enter(patientId, trigger);
      setPacket(data);
      return data;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to enter crisis mode");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const exit = useCallback(async (patientId: string) => {
    try {
      await crisisApi.exit(patientId);
    } catch {
      // best-effort
    }
    setPacket(null);
  }, []);

  return { packet, loading, error, fetchPacket, enter, exit };
}
