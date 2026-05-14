"use client";

import { useEffect, useState } from "react";
import { Plus, UserCircle } from "lucide-react";
import { usePatient } from "@/hooks/usePatient";
import { usePrescribers } from "@/hooks/usePrescribers";
import { useMedications } from "@/hooks/useMedications";
import { PrescriberCard, PrescriberModal } from "@/components/prescribers";
import type { PrescriberCreate, PrescriberResponse } from "@/lib/types";

export default function PrescribersPage() {
  const { activePatient } = usePatient();
  const { prescribers, loading, error, fetch, add, update, deactivate } = usePrescribers();
  const { medications, fetch: fetchMeds } = useMedications();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PrescriberResponse | null>(null);

  useEffect(() => {
    if (activePatient) {
      fetch(activePatient.id);
      fetchMeds(activePatient.id, true); // active meds only
    }
  }, [activePatient?.id, fetch, fetchMeds]);

  async function handleSubmit(data: PrescriberCreate) {
    if (!activePatient) return;
    if (editing) {
      await update(activePatient.id, editing.id, data);
    } else {
      await add(activePatient.id, data);
    }
    setModalOpen(false);
    setEditing(null);
  }

  if (!activePatient) return null;

  // Show prescribers not explicitly deactivated (is_active undefined → treat as active)
  const activePrescribers = prescribers.filter(p => p.is_active !== false);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Page heading */}
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-primary)]">Prescribers</h1>
        <p className="text-sm text-[var(--color-muted)] mt-0.5">
          Doctors managing {activePatient.name}'s care
        </p>
      </div>

      {error && (
        <p className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-semibold border border-red-100">
          {error}
        </p>
      )}

      {/* Add button row */}
      <div className="flex justify-end">
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-action)] hover:bg-[var(--color-action)]/90 text-white text-sm font-bold transition-colors"
        >
          <Plus size={16} />
          Add Prescriber
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-52 bg-[var(--color-border)] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : activePrescribers.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-[var(--color-border)]">
          <UserCircle size={40} className="mx-auto mb-3 text-[var(--color-border)]" />
          <p className="text-base font-bold text-[var(--color-text)]">No prescribers yet</p>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Add doctors who prescribe medications or manage care.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {activePrescribers.map(p => (
            <PrescriberCard
              key={p.id}
              prescriber={p}
              medications={medications.filter(
                m => m.status === "active" && (m.prescriber_id === p.id || m.prescriber_name === p.name)
              )}
              onEdit={() => { setEditing(p); setModalOpen(true); }}
              onDeactivate={() => deactivate(activePatient.id, p.id)}
            />
          ))}
        </div>
      )}

      <PrescriberModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        initialData={editing}
      />
    </div>
  );
}
