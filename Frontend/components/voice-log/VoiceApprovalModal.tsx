"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import type { VoiceUploadState } from "@/hooks/useVoiceLog";

interface VoiceApprovalModalProps {
  open: boolean;
  onClose: () => void;
  voiceState: VoiceUploadState;
  onApprove: () => Promise<void>;
  onReject: (reason?: string) => Promise<void>;
  onTextChange: (text: string) => void;
}

export function VoiceApprovalModal({
  open,
  onClose,
  voiceState,
  onApprove,
  onReject,
  onTextChange,
}: VoiceApprovalModalProps) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleApprove() {
    setApproving(true);
    try { await onApprove(); setSaved(true); }
    finally { setApproving(false); }
  }

  async function handleReject() {
    setRejecting(true);
    try { await onReject("Not accurate"); onClose(); }
    finally { setRejecting(false); }
  }

  function handleClose() {
    setSaved(false);
    onClose();
  }

  const data = voiceState.extractedData ?? {};
  const hasObservationFields = Object.keys(data).length > 0;

  return (
    <Modal open={open} onClose={handleClose} title="Review voice note" size="lg">
      <div className="space-y-4">

        {/* ── Saved state ── */}
        {saved && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-green-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">Observation saved!</p>
              <p className="text-sm text-slate-500 mt-1">Voice note + transcript linked to patient record.</p>
            </div>
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Close
              </Button>
              <Link href="/observations" className="flex-1" onClick={handleClose}>
                <Button variant="primary" className="w-full flex items-center justify-center gap-1.5">
                  View in Observations
                  <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ── Normal review state ── */}
        {!saved && (<>

        {/* Transcription failed banner */}
        {voiceState.transcriptionFailed && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            AI transcription failed. You can type the note manually below and still save it.
          </div>
        )}

        {/* Editable transcript */}
        <div>
          <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-1">
            Transcript {voiceState.transcriptionFailed ? "(manual)" : ""}
          </p>
          <textarea
            className="w-full text-sm text-[var(--color-text)] bg-[var(--color-surface)] rounded-lg p-3 max-h-40 overflow-y-auto leading-relaxed border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            rows={4}
            placeholder="Transcript will appear here. You can edit or type your note…"
            value={voiceState.extractedText ?? ""}
            onChange={e => onTextChange(e.target.value)}
          />
        </div>

        {/* Extracted observation fields */}
        {hasObservationFields && (
          <div>
            <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">
              Extracted observations
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {Object.entries(data).map(([key, val]) => {
                const conf = voiceState.fieldConfidence?.[key];
                const display = Array.isArray(val)
                  ? (val as unknown[]).join(", ") || "—"
                  : val != null ? String(val) : "—";
                return (
                  <div key={key} className="flex items-center justify-between gap-4 text-xs py-1 border-b border-[var(--color-border)] last:border-0">
                    <span className="font-medium text-[var(--color-text)] capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-muted)]">{display}</span>
                      {conf !== undefined && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          conf >= 0.8 ? "bg-[var(--color-ok)]/15 text-[var(--color-ok)]"
                          : "bg-[var(--color-watch)]/15 text-[var(--color-watch)]"
                        }`}>
                          {Math.round(conf * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-[var(--color-muted)]">
          Saving creates an observation linked to the audio recording.
        </p>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" loading={rejecting} onClick={handleReject}>
            Discard
          </Button>
          <Button variant="primary" className="flex-1" loading={approving} onClick={handleApprove}>
            Save observation
          </Button>
        </div>
        </>)}
      </div>
    </Modal>
  );
}
