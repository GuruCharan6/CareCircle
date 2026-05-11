"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { Upload, File } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { DocumentType } from "@/lib/types";

const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.webp,.heic";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

interface UploadZoneProps {
  onUpload: (file: File, docType: DocumentType, contentHash?: string) => Promise<void>;
  loading?: boolean;
}

export function UploadZone({ onUpload, loading }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
      await onUpload(file, "other", hash);
    } catch (err) {
      console.error("Hash calculation failed", err);
      await onUpload(file, "other");
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
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 text-center transition-colors",
          dragging
            ? "border-[var(--color-action)] bg-[var(--color-surface)]"
            : "border-[var(--color-border)] hover:border-[var(--color-action)]/50"
        )}
      >
        <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-[var(--color-action)]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 11-8 8z" />
            </svg>
          ) : dragging ? (
            <File size={22} className="text-[var(--color-action)]" />
          ) : (
            <Upload size={22} className="text-[var(--color-action)]" />
          )}
        </div>

        <div>
          <p className="font-medium text-sm text-[var(--color-text)]">
            {loading ? "Uploading…" : "Drop file here or click to browse"}
          </p>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">PDF, JPG, PNG, HEIC — up to 20 MB</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={handleChange}
          className="sr-only"
          aria-label="Upload document"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
        >
          Choose file
        </Button>
      </div>

      {fileError && <p className="text-xs text-[var(--color-alert)]">{fileError}</p>}
    </div>
  );
}
