"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { usePatient } from "@/hooks/usePatient";
import { useSearch } from "@/hooks/useSearch";
import { SearchResults } from "@/components/search/SearchResults";
import type { DocumentType } from "@/lib/types";

const SEARCH_FILTERS = [
  { value: "", label: "All types" },
  { value: "prescription", label: "Prescriptions" },
  { value: "lab_report", label: "Labs" },
  { value: "observation", label: "Observations" },
  { value: "medication", label: "Medications" },
  { value: "appointment", label: "Appointments" },
];

export default function SearchPage() {
  const { activePatient } = usePatient();
  const { results, query, total, loading, error, search, clear } = useSearch();
  const searchParams = useSearchParams();

  const [inputValue, setInputValue] = useState("");
  const [filterType, setFilterType] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitRef = useRef(false);

  // Pre-fill from topbar redirect: /search?q=...
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    const q = searchParams.get("q");
    if (q && q.trim() && activePatient) {
      setInputValue(q);
      search(activePatient.id, q, undefined);
    }
  }, [activePatient?.id, searchParams, search]);

  const handleInput = useCallback((value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { clear(); return; }
    debounceRef.current = setTimeout(() => {
      if (activePatient) {
        search(activePatient.id, value, filterType || undefined);
      }
    }, 400);
  }, [activePatient?.id, filterType, search, clear]);

  function handleClear() {
    setInputValue("");
    clear();
  }

  function handleFilterChange(value: string) {
    setFilterType(value);
    if (inputValue.trim() && activePatient) {
      search(activePatient.id, inputValue, value || undefined);
    }
  }

  if (!activePatient) {
    return <p className="text-[var(--color-muted)] text-sm">No patient selected.</p>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-primary)]">Search Records</h1>
        <p className="text-sm text-slate-400 mt-1">
          Search across all of {activePatient.name}'s documents
        </p>
      </div>

      {/* Search Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-[11px] font-bold text-[#0D3B6E] uppercase tracking-wider">Search Query</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={inputValue}
                onChange={e => handleInput(e.target.value)}
                placeholder="HbA1c trend"
                className="w-full h-11 pl-10 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[var(--color-action)] transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && search(activePatient.id, inputValue, filterType || undefined)}
              />
            </div>
          </div>

          <div className="w-full md:w-64 space-y-2">
            <label className="text-[11px] font-bold text-[#0D3B6E] uppercase tracking-wider">Filter by Type</label>
            <select
              value={filterType}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[var(--color-action)] bg-white appearance-none cursor-pointer"
            >
              {SEARCH_FILTERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => search(activePatient.id, inputValue, filterType || undefined)}
            className="w-full md:w-auto px-8 h-11 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98] shrink-0"
          >
            Search
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--color-alert)]">{error}</p>}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <SearchResults results={results} query={query} total={total} />
      )}
    </div>
  );
}
