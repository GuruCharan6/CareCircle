"use client";

import { useState, useCallback } from "react";
import { digestApi } from "@/lib/api/digest";
import type { DigestResponse, DigestPreferencesUpdate } from "@/lib/types";

const cache: Record<string, DigestResponse> = {};

export function useDigest() {
  const [digest, setDigest] = useState<DigestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (patientId: string, period?: "morning" | "evening") => {
    const cacheKey = `${patientId}_${period || "current"}`;
    if (cache[cacheKey]) {
      setDigest(cache[cacheKey]);
    }

    setLoading(true);
    setError(null);
    try {
      const data = await digestApi.get(patientId, period);
      setDigest(data);
      cache[cacheKey] = data;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load digest");
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (patientId: string, data: DigestPreferencesUpdate) => {
    await digestApi.updatePreferences(patientId, data);
  }, []);

  return { digest, loading, error, fetch, updatePreferences };
}
