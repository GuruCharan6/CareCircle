"use client";

import { Building2, Phone } from "lucide-react";
import type { PrescriberResponse, MedicationResponse } from "@/lib/types";

const AVATAR_COLORS = [
  "#0D3B6E",
  "#1D9E75",
  "#D97706",
  "#7C3AED",
  "#0891B2",
  "#DC2626",
];

function avatarColor(name: string): string {
  const sum = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface Props {
  prescriber: PrescriberResponse;
  medications: MedicationResponse[];
  onEdit: () => void;
  onDeactivate: () => void;
}

export function PrescriberCard({ prescriber, medications, onEdit, onDeactivate }: Props) {
  const color = avatarColor(prescriber.name);

  function handleDeactivate() {
    if (confirm(`Deactivate Dr. ${prescriber.name}? They will no longer appear in the active prescribers list.`)) {
      onDeactivate();
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-5 flex flex-col gap-4">
      {/* Header: avatar + name + specialty */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm"
          style={{ backgroundColor: color }}
        >
          {initials(prescriber.name)}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[var(--color-text)] text-base leading-tight truncate">
            {prescriber.name}
          </p>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">
            {prescriber.specialty || "General Practitioner"}
          </p>
        </div>
      </div>

      {/* Hospital + Phone */}
      <div className="space-y-2">
        {prescriber.hospital && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <Building2 size={14} className="text-[var(--color-muted)] shrink-0" />
            <span className="truncate">{prescriber.hospital}</span>
          </div>
        )}
        {prescriber.phone && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <Phone size={14} className="text-rose-500 shrink-0" />
            <span>{prescriber.phone}</span>
          </div>
        )}
      </div>

      {/* Medication pills */}
      {medications.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {medications.slice(0, 4).map(m => (
            <span
              key={m.id}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200"
            >
              {m.brand_name || m.generic_name}
            </span>
          ))}
          {medications.length > 4 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium text-[var(--color-muted)] bg-[var(--color-bg)]">
              +{medications.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1 border-t border-[var(--color-border)]">
        <button
          onClick={onEdit}
          className="px-4 py-1.5 rounded-lg border border-[var(--color-border)] text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-bg)] transition-colors"
        >
          Edit
        </button>
        <button
          onClick={handleDeactivate}
          className="text-sm font-semibold text-[var(--color-muted)] hover:text-red-500 transition-colors"
        >
          Deactivate
        </button>
      </div>
    </div>
  );
}
