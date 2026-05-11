"use client";

import React from "react";

interface ExtractionReviewProps {
  docType: string;
  data: Record<string, any>;
  confidence: Record<string, number>;
  onChange: (newData: Record<string, any>) => void;
}

export function ExtractionReview({ docType, data, confidence, onChange }: ExtractionReviewProps) {
  const handleFieldChange = (key: string, value: any) => {
    onChange({ [key]: value });
  };

  const handleMedicationChange = (index: number, field: string, value: string) => {
    const meds = Array.isArray(data.medications) ? [...data.medications] : [];
    if (meds[index]) {
      meds[index] = { ...meds[index], [field]: value };
      handleFieldChange("medications", meds);
    }
  };

  const handleResultChange = (index: number, field: string, value: any) => {
    const results = Array.isArray(data.results) ? [...data.results] : [];
    if (results[index]) {
      results[index] = { ...results[index], [field]: value };
      handleFieldChange("results", results);
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(data).map(([key, val]) => {
        // Render Medications
        if (key === "medications" && Array.isArray(val)) {
          return (
            <div key={key} className="space-y-3 bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
              <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-tight mb-2">Medications Found</p>
              {val.map((med: any, idx: number) => (
                <div key={idx} className="space-y-3 p-3 border border-[var(--color-border)]/50 rounded-lg bg-white mb-4 last:mb-0">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Brand Name" value={med.brand_name} onChange={(v: string) => handleMedicationChange(idx, "brand_name", v)} />
                    <Field label="Dosage" value={med.dose} onChange={(v: string) => handleMedicationChange(idx, "dose", v)} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Frequency" value={med.frequency} onChange={(v: string) => handleMedicationChange(idx, "frequency", v)} />
                    <Field label="Duration" value={med.duration} onChange={(v: string) => handleMedicationChange(idx, "duration", v)} />
                  </div>
                </div>
              ))}
            </div>
          );
        }

        // Render Lab Results
        if (key === "results" && Array.isArray(val)) {
          return (
            <div key={key} className="space-y-3 bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
              <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-tight mb-2">Lab Results Found</p>
              {val.map((res: any, idx: number) => (
                <div key={idx} className="space-y-3 p-3 border border-[var(--color-border)]/50 rounded-lg bg-white mb-4 last:mb-0">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Field label="Test Name" value={res.test_name_display || res.test_name} onChange={(v: string) => handleResultChange(idx, "test_name_display", v)} />
                    </div>
                    <Field label="Value" value={res.value} onChange={(v: string) => handleResultChange(idx, "value", v)} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Unit" value={res.unit} onChange={(v: string) => handleResultChange(idx, "unit", v)} />
                    <Field label="Ref Low" value={res.reference_range_low} onChange={(v: string) => handleResultChange(idx, "reference_range_low", v)} />
                    <Field label="Ref High" value={res.reference_range_high} onChange={(v: string) => handleResultChange(idx, "reference_range_high", v)} />
                  </div>
                </div>
              ))}
            </div>
          );
        }

        // Skip non-primitive objects
        if (typeof val === "object" && val !== null) return null;

        // Render generic fields
        const conf = confidence[key];
        return (
          <div key={key}>
            <Field 
              label={key.replace(/_/g, " ")} 
              value={String(val ?? "")} 
              confidence={conf}
              onChange={(v: string) => handleFieldChange(key, v)} 
            />
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, value, onChange, required, confidence }: any) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-center px-0.5">
        <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">{label}</label>
        {confidence !== undefined && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            confidence >= 0.8 ? "bg-[var(--color-ok)]/10 text-[var(--color-ok)]"
            : confidence >= 0.5 ? "bg-[var(--color-watch)]/10 text-[var(--color-watch)]"
            : "bg-[var(--color-alert)]/10 text-[var(--color-alert)]"
          }`}>
            {Math.round(confidence * 100)}% Match
          </span>
        )}
      </div>
      <input 
        type="text"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className={`w-full text-xs p-2.5 border rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-[var(--color-action)]/20 outline-none transition-all ${
          required && !value ? 'border-[var(--color-alert)] bg-red-50/30' : 'border-[var(--color-border)]'
        }`}
      />
    </div>
  );
}
