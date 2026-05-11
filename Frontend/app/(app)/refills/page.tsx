"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, CheckCircle } from "lucide-react";
import { usePatient } from "@/hooks/usePatient";
import { useRefills } from "@/hooks/useRefills";
import { useMedications } from "@/hooks/useMedications";
import { RefillCard, RefillModal } from "@/components/refills";
import { notificationsApi } from "@/lib/api/notifications";
import type { RefillCreate, MedicationResponse, RefillStatusResponse } from "@/lib/types";

export interface EnrichedRefill {
  refill: RefillStatusResponse;
  med: MedicationResponse;
}

export default function RefillsPage() {
  const { activePatient } = usePatient();
  const { dueRefills, loading, fetchDue, create, confirm } = useRefills();
  const { medications, fetch: fetchMeds } = useMedications();
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(() => {
    if (!activePatient) return;
    fetchDue(activePatient.id, 14); // show up to 14 days
    fetchMeds(activePatient.id, false); // all meds, not just active
  }, [activePatient?.id, fetchDue, fetchMeds]);

  useEffect(() => { load(); }, [load]);

  // Join refills with medications, filter out discontinued
  const enriched: EnrichedRefill[] = useMemo(() => {
    return dueRefills
      .map(r => {
        const med = medications.find(m => m.id === r.medication_id);
        return med ? { refill: r, med } : null;
      })
      .filter((x): x is EnrichedRefill => x !== null && x.med.status === "active");
  }, [dueRefills, medications]);

  async function handleConfirm(refill: RefillStatusResponse, _daysSupply: number) {
    if (!activePatient) return;

    // Confirm the existing refill tracking record
    await confirm(activePatient.id, refill.id);

    // Mark related refill_reminder notifications as handled
    try {
      const notifs = await notificationsApi.list(activePatient.id, { limit: 50 });
      const targets = notifs.filter(
        n =>
          n.type === "refill_reminder" &&
          (n.linked_entity_id === refill.medication_id || n.linked_entity_id === refill.id) &&
          n.requires_acknowledge
      );
      await Promise.all(
        targets.map(n => notificationsApi.acknowledge(activePatient.id, n.id, { action: "handled" }))
      );
    } catch {
      // non-critical — don't block on notification failure
    }

    // Refresh list
    setTimeout(() => load(), 400);
  }

  async function handleCreate(data: RefillCreate) {
    if (!activePatient) return;
    await create(activePatient.id, data);
    setModalOpen(false);
    load();
  }

  if (!activePatient) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">Medication Refills</h1>
        <p className="text-sm text-[var(--color-muted)] mt-0.5">
          Upcoming refills due within 14 days
        </p>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map(i => (
            <div key={i} className="h-52 bg-[var(--color-border)] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : enriched.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <CheckCircle size={40} className="text-[var(--color-ok)]" />
          <p className="text-sm font-semibold text-[var(--color-text)]">All refills are up to date</p>
          <p className="text-xs text-[var(--color-muted)]">No refills due in the next 14 days.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {enriched.map(({ refill, med }) => (
            <RefillCard
              key={refill.id}
              refill={refill}
              med={med}
              onConfirm={(daysSupply) => handleConfirm(refill, daysSupply)}
            />
          ))}
        </div>
      )}

      {/* Create refill request */}
      <div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-bg)] transition-colors"
        >
          <Plus size={15} />
          Create Refill Request
        </button>
      </div>

      <RefillModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        medications={medications.filter(m => m.status === "active")}
        onCreate={handleCreate}
      />
    </div>
  );
}
