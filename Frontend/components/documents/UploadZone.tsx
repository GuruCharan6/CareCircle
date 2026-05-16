"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { Upload, Camera, FileText, FlaskConical, Stethoscope, PenLine, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentType } from "@/lib/types";

const IMAGE_TYPES = ".jpg,.jpeg,.png,.webp,.heic,.heif,.tiff,.bmp";
const AUDIO_TYPES = ".mp3,.m4a,.ogg,.wav,.webm,.aac";
const DOC_TYPES_ACCEPT = `${IMAGE_TYPES},.pdf`;
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

const SELECTABLE_TYPES: {
  type: DocumentType;
  label: string;
  icon: React.ReactNode;
  color: string;
  accept: string;
  hint: string;
}[] = [
  {
    type: "prescription",
    label: "Prescription",
    icon: <FileText size={15} />,
    color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
    accept: DOC_TYPES_ACCEPT,
    hint: "Image or PDF",
  },
  {
    type: "lab_report",
    label: "Lab Report",
    icon: <FlaskConical size={15} />,
    color: "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100",
    accept: DOC_TYPES_ACCEPT,
    hint: "Image or PDF",
  },
  {
    type: "doctor_note",
    label: "Doctor Note",
    icon: <Stethoscope size={15} />,
    color: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100",
    accept: DOC_TYPES_ACCEPT,
    hint: "Image or PDF",
  },
  {
    type: "handwritten_note",
    label: "Handwritten",
    icon: <PenLine size={15} />,
    color: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
    accept: DOC_TYPES_ACCEPT,
    hint: "Image or PDF",
  },
  {
    type: "voice_note",
    label: "Voice Note",
    icon: <Mic size={15} />,
    color: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100",
    accept: AUDIO_TYPES,
    hint: "MP3, M4A, WAV, OGG",
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

  const activeConfig = SELECTABLE_TYPES.find(d => d.type === selectedType)!;
  const isVoiceNote = selectedType === "voice_note";

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
      <div className="grid grid-cols-3 gap-2">
        {SELECTABLE_TYPES.map(({ type, label, icon, color }) => (
          <button
            key={type}
            type="button"
            disabled={loading}
            onClick={() => setSelectedType(type)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-[11px] font-semibold transition-all",
              color,
              selectedType === type
                ? "ring-2 ring-offset-1 ring-current shadow-sm scale-[1.02]"
                : "opacity-60"
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Drop zone */}
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
        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm">
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-[var(--color-action)]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 11-8 8z" />
            </svg>
          ) : isVoiceNote ? (
            <Mic size={22} className="text-[var(--color-action)]" />
          ) : (
            <Upload size={22} className="text-[var(--color-action)]" />
          )}
        </div>

        <div className="space-y-1">
          <p className="font-bold text-base text-[var(--color-primary)]">
            {loading ? "Uploading…" : `Upload ${activeConfig.label}`}
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            {loading ? "Extracting data with AI…" : "Drag & drop or tap to browse"}
          </p>
          <p className="text-xs text-[var(--color-muted)] font-medium opacity-70 mt-1">
            {activeConfig.hint}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={activeConfig.accept}
          onChange={handleChange}
          className="sr-only"
          aria-label="Upload document"
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          className="sr-only"
          aria-label="Take photo"
        />
      </div>

      {/* Camera button — mobile only, hidden for voice notes */}
      {!isVoiceNote && (
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={loading}
          className="lg:hidden w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--color-border)] bg-white text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors disabled:opacity-50"
        >
          <Camera size={16} className="text-[var(--color-action)]" />
          Take a photo
        </button>
      )}

      {fileError && <p className="text-xs text-[var(--color-alert)]">{fileError}</p>}
    </div>
  );
}
