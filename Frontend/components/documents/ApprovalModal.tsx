"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { UploadState } from "@/hooks/useDocuments";
import { FileView } from "@/components/documents/FileView";
import { ExtractionReview } from "@/components/documents/ExtractionReview";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApprovalModalProps {
  open: boolean;
  onClose: () => void;
  uploadState: UploadState;
  onApprove: (docId: string, data: any) => Promise<void>;
  onReject: (docId: string, reason: string) => Promise<void>;
  onUpdate: (data: Record<string, any>) => void;
  onReprocess?: (docId: string) => Promise<void>;
}

export function ApprovalModal({ open, onClose, uploadState, onApprove, onReject, onUpdate, onReprocess }: ApprovalModalProps) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  // Check if any field has low confidence (< 0.5)
  const hasLowConfidence = uploadState.fieldConfidence
    ? Object.values(uploadState.fieldConfidence).some(v => v < 0.5)
    : false;
  
  // Local state for editable data
  const [editedData, setEditedData] = useState<Record<string, any>>(uploadState.extractedData ?? {});

  // Update local state if props change (e.g. after extraction finishes)
  useEffect(() => {
    if (uploadState.extractedData) {
      setEditedData(uploadState.extractedData);
    }
  }, [uploadState.extractedData]);

  async function handleApprove() {
    setApproving(true);
    try {
      await onApprove(uploadState.docId, editedData);
      onClose();
    } finally {
      setApproving(false);
    }
  }

  async function handleReprocess() {
    if (!onReprocess) return;
    setReprocessing(true);
    try {
      await onReprocess(uploadState.docId);
    } finally {
      setReprocessing(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    try {
      await onReject(uploadState.docId, rejectReason.trim());
      onClose();
    } finally {
      setRejecting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Review Extraction" size="xl">
      <div className="flex h-[75vh] divide-x divide-[var(--color-border)]">
        {/* Left: Preview */}
        <div className="w-1/2 p-4 overflow-hidden flex flex-col gap-4">
          {uploadState.extractedText && (
            <div className="shrink-0">
              <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase mb-2">Original Text</p>
              <div className="text-xs bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] max-h-32 overflow-y-auto whitespace-pre-wrap">
                {uploadState.extractedText}
              </div>
            </div>
          )}
          <div className="flex-1 flex items-center justify-center bg-[var(--color-surface)] rounded-xl border-2 border-dashed border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-muted)]">Document preview unavailable during initial extraction</p>
          </div>
        </div>

        {/* Right: Review */}
        <div className="w-1/2 flex flex-col">
          {hasLowConfidence && onReprocess && (
            <div className="px-4 pt-4 pb-0">
              <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                  <span className="text-[11px] font-semibold text-amber-700 truncate">
                    Low confidence fields detected. Image may be blurry.
                  </span>
                </div>
                <button
                  onClick={handleReprocess}
                  disabled={reprocessing}
                  className="flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 shrink-0 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={11} className={reprocessing ? "animate-spin" : ""} />
                  {reprocessing ? "Re-extracting…" : "Re-extract"}
                </button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-6">
            <ExtractionReview
              docType={uploadState.docType}
              data={editedData}
              confidence={uploadState.fieldConfidence || {}}
              onChange={newData => {
                const updated = { ...editedData, ...newData };
                setEditedData(updated);
                onUpdate(newData);
              }}
            />
          </div>

          <div className="p-4 border-t border-[var(--color-border)] space-y-3">
            {showReject ? (
              <div className="space-y-3">
                <input
                  autoFocus
                  placeholder="Reason for rejection..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full text-xs p-2.5 border border-[var(--color-alert)] rounded-xl outline-none"
                />
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowReject(false)}>Back</Button>
                  <Button variant="danger" className="flex-1" loading={rejecting} onClick={handleReject} disabled={!rejectReason.trim()}>Confirm Reject</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowReject(true)}>Reject</Button>
                <Button
                  variant="primary"
                  className="flex-1 font-bold"
                  loading={approving}
                  onClick={handleApprove}
                  disabled={editedData.medications?.some((m: any) => !m.dose)}
                >
                  Approve &amp; Save
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
