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

  const handleLabValueChange = (index: number, field: string, value: any) => {
    const vals = Array.isArray(data.recent_lab_values) ? [...data.recent_lab_values] : [];
    if (vals[index]) {
      vals[index] = { ...vals[index], [field]: value };
      handleFieldChange("recent_lab_values", vals);
    }
  };

  // Collect generic primitive fields to render grouped
  const genericFields = Object.entries(data).filter(([key, val]) => {
    if (key === "medications" || key === "results" || key === "recent_lab_values" || key === "ordered_tests") return false;
    return typeof val !== "object" || val === null;
  });

  return (
    <div className="space-y-5">
      {/* Medications */}
      {Array.isArray(data.medications) && data.medications.length > 0 && (
        <Section title="Medications" accent="primary">
          {data.medications.map((med: any, idx: number) => (
            <Card key={idx} index={idx + 1} total={data.medications.length}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Brand Name" value={med.brand_name || med.generic_name} onChange={(v: string) => handleMedicationChange(idx, "brand_name", v)} />
                <Field label="Dosage" value={med.dose} onChange={(v: string) => handleMedicationChange(idx, "dose", v)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Frequency" value={med.frequency} onChange={(v: string) => handleMedicationChange(idx, "frequency", v)} />
                <Field label="Duration" value={med.duration} onChange={(v: string) => handleMedicationChange(idx, "duration", v)} />
              </div>
            </Card>
          ))}
        </Section>
      )}

      {/* Lab Results (from lab reports) */}
      {Array.isArray(data.results) && data.results.length > 0 && (
        <Section title="Lab Results" accent="ok">
          {data.results.map((res: any, idx: number) => (
            <Card key={idx} index={idx + 1} total={data.results.length}>
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
            </Card>
          ))}
        </Section>
      )}

      {/* Vitals & Lab Values extracted from prescriptions */}
      {Array.isArray(data.recent_lab_values) && data.recent_lab_values.length > 0 && (
        <Section title="Vitals & Lab Values at Visit" accent="watch">
          {data.recent_lab_values.map((item: any, idx: number) => (
            <Card key={idx} index={idx + 1} total={data.recent_lab_values.length}>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="Test / Vital" value={item.test_name_display || item.test_name} onChange={(v: string) => handleLabValueChange(idx, "test_name_display", v)} />
                </div>
                <Field label="Value" value={item.value} onChange={(v: string) => handleLabValueChange(idx, "value", v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit" value={item.unit} onChange={(v: string) => handleLabValueChange(idx, "unit", v)} />
                <Field label="Date" value={item.test_date} onChange={(v: string) => handleLabValueChange(idx, "test_date", v)} />
              </div>
            </Card>
          ))}
        </Section>
      )}

      {/* Document Details (generic primitive fields) */}
      {genericFields.length > 0 && (
        <Section title="Document Details" accent="muted">
          <div className="grid grid-cols-2 gap-3">
            {genericFields.map(([key, val]) => {
              const conf = confidence[key];
              return (
                <Field
                  key={key}
                  label={key.replace(/_/g, " ")}
                  value={String(val ?? "")}
                  confidence={conf}
                  onChange={(v: string) => handleFieldChange(key, v)}
                />
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: "primary" | "ok" | "watch" | "muted"; children: React.ReactNode }) {
  const bar: Record<string, string> = {
    primary: "bg-[var(--color-primary)]",
    ok: "bg-[var(--color-ok)]",
    watch: "bg-[var(--color-watch)]",
    muted: "bg-[var(--color-muted)]",
  };
  const text: Record<string, string> = {
    primary: "text-[var(--color-primary)]",
    ok: "text-[var(--color-ok)]",
    watch: "text-[var(--color-watch)]",
    muted: "text-[var(--color-muted)]",
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2.5 bg-white/60">
        <div className={`w-1 h-4 rounded-full shrink-0 ${bar[accent]}`} />
        <p className={`text-[11px] font-bold uppercase tracking-widest ${text[accent]}`}>{title}</p>
      </div>
      <div className="p-4 space-y-3">
        {children}
      </div>
    </div>
  );
}

function Card({ children, index, total }: { children: React.ReactNode; index: number; total: number }) {
  return (
    <div className="space-y-3 p-4 border border-[var(--color-border)]/60 rounded-xl bg-white">
      {total > 1 && (
        <p className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-widest">
          #{index} of {total}
        </p>
      )}
      {children}
    </div>
  );
}

function Field({ label, value, onChange, required, confidence }: any) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">{label}</label>
        {confidence !== undefined && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            confidence >= 0.8 ? "bg-[var(--color-ok)]/10 text-[var(--color-ok)]"
            : confidence >= 0.5 ? "bg-[var(--color-watch)]/10 text-[var(--color-watch)]"
            : "bg-[var(--color-alert)]/10 text-[var(--color-alert)]"
          }`}>
            {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
      <input
        type="text"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className={`w-full text-xs p-2.5 border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-[var(--color-action)]/20 outline-none transition-all ${
          required && !value ? "border-[var(--color-alert)] bg-red-50/30" : "border-[var(--color-border)]"
        }`}
      />
    </div>
  );
}
