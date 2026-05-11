"use client";

import React, { useState, useEffect } from "react";
import { useDocuments } from "@/hooks/useDocuments";
import { usePatient } from "@/hooks/usePatient";
import { Modal } from "@/components/ui/Modal";
import { UploadZone } from "@/components/documents/UploadZone";
import { ApprovalModal } from "@/components/documents/ApprovalModal";

export function GlobalUpload() {
  const [open, setOpen] = useState(false);
  const { activePatient } = usePatient();
  const {
    uploadState, uploadLoading, upload, approve, reject, updateExtractedData, clearUpload
  } = useDocuments();

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('open-upload', handleOpen);
    return () => window.removeEventListener('open-upload', handleOpen);
  }, []);

  async function handleUpload(file: File) {
    if (!activePatient) return;
    await upload(activePatient.id, file, "other");
    // Don't close immediately — the ApprovalModal will take over
  }

  function handleClose() {
    setOpen(false);
    clearUpload();
  }

  return (
    <>
      <Modal open={open && !uploadState} onClose={() => setOpen(false)} title="Upload Document">
        <div className="p-4">
          <UploadZone onUpload={handleUpload} loading={uploadLoading} />
        </div>
      </Modal>

      {uploadState && (
        <ApprovalModal
          open={uploadState.status === "review_required"}
          onClose={handleClose}
          uploadState={uploadState}
          onApprove={async (id, data) => {
            await approve(id, data);
            setOpen(false);
          }}
          onReject={async (id, reason) => {
            await reject(id, reason);
            setOpen(false);
          }}
          onUpdate={updateExtractedData}
        />
      )}
    </>
  );
}
