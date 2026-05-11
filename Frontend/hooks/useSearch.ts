"use client";

import { useState, useCallback } from "react";
import { searchApi } from "@/lib/api/search";
import type { SearchResultItem, DocumentType } from "@/lib/types";

export function useSearch() {
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (
    patientId: string,
    q: string,
    filterType?: string,
    limit = 20
  ) => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      setQuery("");
      return;
    }

    setLoading(true);
    setError(null);
    setQuery(q);

    try {
      const data = await searchApi.search(patientId, { q, filter_type: filterType, limit });
      setResults(data.results);
      setTotal(data.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setQuery("");
    setTotal(0);
    setError(null);
  }, []);

  return { results, query, total, loading, error, search, clear };
}
