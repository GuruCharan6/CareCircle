"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { Upload, Camera, FileText, FlaskConical, Stethoscope, File } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentType } from "@/lib/types";

const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.webp,.heic";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

const DOC_TYPES: { value: DocumentType; label: string; icon: React.ReactNode; color: string }[] = [
  {
    value: "prescription",
    label: "Prescription",
    icon: <FileText size={14} />,
    color: "border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]",
  },
  {
    value: "lab_report",
    label: "Lab Report",
    icon: <FlaskConical size={14} />,
    color: "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]",
  },
  {
    value: "doctor_note",
    label: "Doctor Note",
    icon: <Stethoscope size={14} />,
    color: "border-[#0D3B6E] bg-[#0D3B6E]/10 text-[#0D3B6E]",
  },
  {
    value: "other",
    label: "Other",
    icon: <File size={14} />,
    color: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]",
  },
];

interface UploadZoneProps {
  onUpload: (file: File, docType: DocumentType, contentHash?: string) => Promise<void>;
  loading?: boolean;
}

export function UploadZone({ onUpload, loading }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [selectedType, setSelectedType] = useState<DocumentType>("prescription");
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function calculateHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function validateAndUpload(file: File) {
    if (file.size > MAX_BYTES) {
      setFileError("File too large — max 20 MB");
      return;
    }
    setFileError("");
    try {
      const hash = await calculateHash(file);
      await onUpload(file, selectedType, hash);
    } catch (err) {
      console.error("Hash calculation failed", err);
      await onUpload(file, selectedType);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndUpload(file);
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndUpload(file);
  }

  return (
    <div className="space-y-3">
      {/* Document type selector */}
      <div>
        <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest mb-2 px-1">
          Document Type
        </p>
        <div className="grid grid-cols-4 gap-2">
          {DOC_TYPES.map(dt => (
            <button
              key={dt.value}
              type="button"
              onClick={() => setSelectedType(dt.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border-2 text-[11px] font-bold transition-all",
                selectedType === dt.value
                  ? dt.color + " shadow-sm"
                  : "border-[var(--color-border)] bg-white text-[var(--color-muted)] hover:border-[var(--color-border)]/80"
              )}
            >
              {dt.icon}
              <span className="leading-tight text-center">{dt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone — tap anywhere to pick file */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={cn(
          "rounded-2xl py-10 px-6 flex flex-col items-center gap-4 text-center transition-all cursor-pointer select-none",
          dragging
            ? "bg-[#C8EDE4] scale-[0.99]"
            : "bg-[#DFF0EB] hover:bg-[#C8EDE4] active:scale-[0.99]"
        )}
      >
        {/* Icon circle */}
        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm">
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-[var(--color-action)]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 11-8 8z" />
            </svg>
          ) : (
            <Upload size={22} className="text-[var(--color-action)]" />
          )}
        </div>

        <div className="space-y-1">
          <p className="font-bold text-base text-[var(--color-primary)]">
            {loading ? "Uploading…" : "Upload a document"}
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            {loading ? "Extracting data with AI…" : `Selected: ${DOC_TYPES.find(d => d.value === selectedType)?.label}`}
          </p>
          <p className="text-xs text-[var(--color-muted)] font-medium opacity-70 mt-1">
            PDF&nbsp;·&nbsp;JPG&nbsp;·&nbsp;PNG&nbsp;·&nbsp;Voice Note
          </p>
        </div>

        {/* Hidden inputs */}
        <input ref={inputRef} type="file" accept={ACCEPTED} onChange={handleChange} className="sr-only" aria-label="Upload document" />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleChange} className="sr-only" aria-label="Take photo" />
      </div>

      {/* Camera button — mobile only, separate below zone */}
      <button
        onClick={() => cameraRef.current?.click()}
        disabled={loading}
        className="lg:hidden w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--color-border)] bg-white text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors disabled:opacity-50"
      >
        <Camera size={16} className="text-[var(--color-action)]" />
        Take a photo
      </button>

      {fileError && <p className="text-xs text-[var(--color-alert)]">{fileError}</p>}
    </div>
  );
}
