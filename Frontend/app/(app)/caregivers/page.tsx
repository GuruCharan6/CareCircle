"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Users } from "lucide-react";
import { usePatient } from "@/hooks/usePatient";
import { useCaregivers } from "@/hooks/useCaregivers";
import { Button } from "@/components/ui/Button";
import { CaregiverCard } from "@/components/caregivers/CaregiverCard";
import { InviteModal } from "@/components/caregivers/InviteModal";
import type { CaregiverCreate, CaregiverResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function CaregiversPage() {
  const { activePatient } = usePatient();
  const { caregivers, loading, error, fetch, add, remove, reinvite, update } = useCaregivers();

  const [activeOnly, setActiveOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCaregiver, setEditingCaregiver] = useState<CaregiverResponse | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<CaregiverResponse | null>(null);

  const load = useCallback(() => {
    if (activePatient) fetch(activePatient.id, activeOnly);
  }, [activePatient?.id, activeOnly, fetch]);

  useEffect(() => { load(); }, [load]);

  async function handleModalSubmit(data: CaregiverCreate) {
    if (!activePatient) return;
    if (editingCaregiver) {
      await update(activePatient.id, editingCaregiver.id, data);
    } else {
      await add(activePatient.id, data);
    }
    setModalOpen(false);
  }

  if (!activePatient) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">Caregivers</h1>
        <p className="text-sm text-[var(--color-muted)] mt-0.5">
          Caregivers helping with {activePatient.name}'s daily needs
        </p>
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setActiveOnly(!activeOnly)}
          className={cn(
            "px-5 py-2 text-sm font-semibold rounded-xl border transition-all",
            activeOnly
              ? "bg-[var(--color-bg)] border-[var(--color-primary)] text-[var(--color-primary)] shadow-sm"
              : "bg-white border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
          )}
        >
          {activeOnly ? "All Status" : "Active Only"}
        </button>

        <button
          onClick={() => { setEditingCaregiver(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-action)] hover:bg-[var(--color-action)]/90 text-white text-sm font-bold transition-colors shadow-sm"
        >
          <Plus size={18} />
          Add Caregiver
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {loading ? (
          [1, 2].map(i => <div key={i} className="h-44 bg-slate-50 rounded-3xl animate-pulse" />)
        ) : caregivers.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-[var(--color-border)]">
            <Users size={40} className="mx-auto mb-3 text-[var(--color-border)]" />
            <p className="text-base font-bold text-[var(--color-text)]">No caregivers yet</p>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              Invite family or professionals to help with daily care.
            </p>
          </div>
        ) : (
          caregivers.map(cg => (
            <CaregiverCard
              key={cg.id}
              caregiver={cg}
              onRemove={setConfirmRemove}
              onReinvite={(cg) => reinvite(activePatient.id, cg.id)}
              onEdit={() => { setEditingCaregiver(cg); setModalOpen(true); }}
            />
          ))
        )}
      </div>

      <InviteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingCaregiver}
      />

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmRemove(null)} />
          <div className="relative bg-white rounded-2xl p-8 max-w-md w-full space-y-6 shadow-2xl border border-[var(--color-border)]">
            <div className="text-center">
              <h3 className="text-xl font-bold text-[var(--color-text)]">Remove caregiver?</h3>
              <p className="text-[var(--color-muted)] mt-2 font-bold">Remove <span className="text-[var(--color-text)]">{confirmRemove.name}</span> from the team?</p>
            </div>
            <div className="flex gap-4">
              <button
                className="flex-1 h-12 rounded-xl font-bold border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-bg)] transition-all"
                onClick={() => setConfirmRemove(null)}
              >
                Cancel
              </button>
              <Button
                className="flex-1 h-12 rounded-xl font-bold bg-[var(--color-alert)] hover:bg-[var(--color-alert)]/90 text-white border-none"
                onClick={async () => { await remove(activePatient.id, confirmRemove.id); setConfirmRemove(null); }}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
