"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { UploadState } from "@/hooks/useDocuments";
import { FileView } from "@/components/documents/FileView";
import { ExtractionReview } from "@/components/documents/ExtractionReview";

interface ApprovalModalProps {
  open: boolean;
  onClose: () => void;
  uploadState: UploadState;
  onApprove: (docId: string, data: any) => Promise<void>;
  onReject: (docId: string, reason: string) => Promise<void>;
  onUpdate: (data: Record<string, any>) => void;
}

export function ApprovalModal({ open, onClose, uploadState, onApprove, onReject, onUpdate }: ApprovalModalProps) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  
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
