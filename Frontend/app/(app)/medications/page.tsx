"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { usePatient } from "@/hooks/usePatient";
import { useMedications } from "@/hooks/useMedications";
import { useDrugInteractions } from "@/hooks/useDrugInteractions";
import { MedTable } from "@/components/medications/MedTable";
import { MedModal } from "@/components/medications/MedModal";
import type { MedicationResponse, MedicationCreate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

type Tab = "active" | "discontinued" | "all";

export default function MedicationsPage() {
  const { activePatient } = usePatient();
  const { medications, loading, fetch, create, update, discontinue } = useMedications();
  const { interactions, fetch: fetchInteractions } = useDrugInteractions();

  const router = useRouter();
  const searchParams = useSearchParams();
  const medId = searchParams.get("id");
  const [tab, setTab] = useState<Tab>("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MedicationResponse | null>(null);

  const load = useCallback(() => {
    if (activePatient) {
      fetch(activePatient.id, false); // fetch all meds
      fetchInteractions(activePatient.id); // fetch existing interactions — don't trigger new check on every load
    }
  }, [activePatient, fetch, fetchInteractions]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (medId && medications.length > 0) {
      const target = medications.find(m => m.id === medId);
      if (target) {
        setEditing(target);
        setModalOpen(true);
        // Clear param
        router.replace("/medications");
      }
    }
  }, [medId, medications, router]);

  const counts = useMemo(() => ({
    active:       medications.filter(m => m.status === "active").length,
    discontinued: medications.filter(m => m.status === "discontinued" || m.status === "superseded").length,
    all:          medications.length,
  }), [medications]);

  const filtered = useMemo(() => {
    if (tab === "active")       return medications.filter(m => m.status === "active");
    if (tab === "discontinued") return medications.filter(m => m.status === "discontinued" || m.status === "superseded");
    return medications;
  }, [medications, tab]);

  if (!activePatient) return null;

  const TABS: { key: Tab; label: string }[] = [
    { key: "active",       label: `Active (${counts.active})` },
    { key: "discontinued", label: `Discontinued (${counts.discontinued})` },
    { key: "all",          label: "All" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">Medications</h1>
        <p className="text-sm text-[var(--color-muted)] mt-0.5">
          Active prescriptions for {activePatient.name}
        </p>
      </div>

      {/* Tab bar + Add button */}
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "px-5 py-2 text-sm font-semibold transition-colors",
                tab === key
                  ? "bg-white text-[var(--color-primary)] border-r border-[var(--color-border)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-text)] border-r border-[var(--color-border)] last:border-r-0"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-action)] hover:bg-[var(--color-action)]/90 text-white text-sm font-bold transition-colors"
        >
          <Plus size={16} />
          Add Medication
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="animate-pulse space-y-0 divide-y divide-[var(--color-border)]">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="px-6 py-5 flex gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[var(--color-border)] rounded w-32" />
                  <div className="h-3 bg-[var(--color-border)] rounded w-24 opacity-60" />
                </div>
                <div className="h-4 bg-[var(--color-border)] rounded w-48 self-start" />
              </div>
            ))}
          </div>
        ) : (
          <MedTable
            medications={filtered}
            interactions={interactions}
            onEdit={m => { setEditing(m); setModalOpen(true); }}
            onDiscontinue={m => discontinue(activePatient.id, m.id)}
          />
        )}
      </div>

      <MedModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={async (data) => {
          if (editing) await update(activePatient.id, editing.id, data);
          else await create(activePatient.id, data);
          setModalOpen(false);
          load();
        }}
        existing={editing}
      />
    </div>
  );
}
