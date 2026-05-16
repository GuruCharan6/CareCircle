"use client";

import { useState, useCallback } from "react";
import { drugInteractionsApi } from "@/lib/api/drug-interactions";
import type { DrugInteractionResponse } from "@/lib/types";

export function useDrugInteractions() {
  const [interactions, setInteractions] = useState<DrugInteractionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (patientId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await drugInteractionsApi.list(patientId);
      // Deduplicate by sorted drug pair — backend may accumulate duplicates across check runs
      const seen = new Set<string>();
      const deduped = data.filter(ix => {
        const key = [ix.drug_a_generic, ix.drug_b_generic].sort().join("||");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setInteractions(deduped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load drug interactions");
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerCheck = useCallback(async (patientId: string) => {
    setChecking(true);
    setError(null);
    try {
      const data = await drugInteractionsApi.check(patientId);
      const seen = new Set<string>();
      const deduped = data.filter(ix => {
        const key = [ix.drug_a_generic, ix.drug_b_generic].sort().join("||");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setInteractions(deduped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Interaction check failed");
    } finally {
      setChecking(false);
    }
  }, []);

  const dismiss = useCallback(async (patientId: string, interactionId: string) => {
    // Optimistic remove
    setInteractions(prev => prev.filter(ix => ix.id !== interactionId));
    try {
      await drugInteractionsApi.dismiss(patientId, interactionId);
    } catch (e: unknown) {
      // Rollback on failure — refetch
      const data = await drugInteractionsApi.list(patientId);
      setInteractions(data);
    }
  }, []);

  return { interactions, loading, checking, error, fetch, triggerCheck, dismiss };
}
