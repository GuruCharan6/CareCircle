"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  Phone, User, Heart, Building2, FileText,
  CheckCircle2, Plus, Trash2,
} from "lucide-react";
import { patientsApi } from "@/lib/api/patients";
import type { EmergencyContact, NearestHospital, PatientResponse } from "@/lib/types";

interface EmergencyDetailsModalProps {
  open: boolean;
  onClose: () => void;
  patient: PatientResponse | null;
  onSaved?: () => void;
}

// ── Field row ─────────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, icon, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent ${
            icon ? "pl-9 pr-3" : "px-4"
          }`}
        />
      </div>
    </div>
  );
}

// ── Contact block ─────────────────────────────────────────────────────────────

function ContactBlock({
  label, contact, onChange, onClear, accent,
}: {
  label: string;
  contact: Partial<EmergencyContact>;
  onChange: (c: Partial<EmergencyContact>) => void;
  onClear?: () => void;
  accent: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${accent}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-600">{label}</p>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-slate-300 hover:text-red-400 transition-colors"
            aria-label="Clear contact"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <Field
        label="Name"
        value={contact.name ?? ""}
        onChange={v => onChange({ ...contact, name: v })}
        placeholder="Full name"
        icon={<User size={13} />}
      />
      <Field
        label="Phone"
        value={contact.phone ?? ""}
        onChange={v => onChange({ ...contact, phone: v })}
        placeholder="+91 XXXXX XXXXX"
        icon={<Phone size={13} />}
        type="tel"
      />
      <Field
        label="Relationship"
        value={contact.relationship ?? ""}
        onChange={v => onChange({ ...contact, relationship: v })}
        placeholder="e.g. Spouse, Daughter"
        icon={<Heart size={13} />}
      />
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function EmergencyDetailsModal({
  open, onClose, patient, onSaved,
}: EmergencyDetailsModalProps) {
  const [primary, setPrimary]     = useState<Partial<EmergencyContact>>({});
  const [secondary, setSecondary] = useState<Partial<EmergencyContact> | null>(null);
  const [hospital, setHospital]   = useState<Partial<NearestHospital>>({});
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Populate from patient
  useEffect(() => {
    if (!patient) return;
    setPrimary(patient.emergency_contact_primary ?? {});
    setSecondary(patient.emergency_contact_secondary ?? null);
    setHospital(patient.nearest_hospital ?? {});
    setNotes(patient.emergency_notes ?? "");
  }, [patient]);

  async function handleSave() {
    if (!patient) return;
    if (!primary.name?.trim() || !primary.phone?.trim()) {
      setError("Primary contact name + phone required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await patientsApi.update(patient.id, {
        emergency_contact_primary: primary.name ? (primary as EmergencyContact) : undefined,
        emergency_contact_secondary: secondary?.name ? (secondary as EmergencyContact) : undefined,
        nearest_hospital: hospital.name ? (hospital as NearestHospital) : undefined,
        emergency_notes: notes.trim() || undefined,
      });
      setSaved(true);
      onSaved?.();
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setSaved(false);
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Emergency & Crisis Details" size="md">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

        {/* ── Header note ── */}
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
          <Heart size={13} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-red-500 leading-relaxed">
            These details appear on the emergency card when crisis mode is activated. Keep them current.
          </p>
        </div>

        {/* ── Primary contact ── */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Emergency Contacts</p>
          <ContactBlock
            label="Primary Contact"
            contact={primary}
            onChange={setPrimary}
            accent="bg-red-50/50 border-red-100"
          />

          {/* Secondary contact */}
          {secondary !== null ? (
            <ContactBlock
              label="Secondary Contact"
              contact={secondary}
              onChange={setSecondary}
              onClear={() => setSecondary(null)}
              accent="bg-orange-50/50 border-orange-100"
            />
          ) : (
            <button
              type="button"
              onClick={() => setSecondary({})}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-orange-300 hover:text-orange-500 transition-colors text-xs font-semibold"
            >
              <Plus size={13} />
              Add Secondary Contact
            </button>
          )}
        </div>

        {/* ── Nearest hospital ── */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nearest Hospital</p>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
            <Field
              label="Hospital Name"
              value={hospital.name ?? ""}
              onChange={v => setHospital(prev => ({ ...prev, name: v }))}
              placeholder="e.g. Apollo Hospital"
              icon={<Building2 size={13} />}
            />
            <Field
              label="Emergency Number"
              value={hospital.phone ?? ""}
              onChange={v => setHospital(prev => ({ ...prev, phone: v }))}
              placeholder="+91 XXXXX XXXXX"
              icon={<Phone size={13} />}
              type="tel"
            />
          </div>
        </div>

        {/* ── Emergency notes ── */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <FileText size={11} />
            Emergency Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Critical info for emergency responders — e.g. pacemaker present, penicillin allergy, DNR order…"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
          />
        </div>

        {/* ── Error ── */}
        {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}

        {/* ── Actions ── */}
        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 border-red-500"
            loading={saving}
            onClick={handleSave}
          >
            {saved ? <><CheckCircle2 size={15} /> Saved!</> : "Save Emergency Info"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
