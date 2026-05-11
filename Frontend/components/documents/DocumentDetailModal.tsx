"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { FileView } from "@/components/documents/FileView";
import { ExtractionReview } from "@/components/documents/ExtractionReview";
import { Button } from "@/components/ui/Button";
import type { DocumentResponse } from "@/lib/types";

interface DocumentDetailModalProps {
  open: boolean;
  onClose: () => void;
  document: DocumentResponse;
  onSave: (id: string, data: any) => Promise<void>;
}

export function DocumentDetailModal({ open, onClose, document, onSave }: DocumentDetailModalProps) {
  const [data, setData] = useState<Record<string, any>>(document.extracted_data || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (document.extracted_data) {
      setData(document.extracted_data);
    }
  }, [document.id, document.extracted_data]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(document.id, data);
      onClose();
    } catch (e) {
      console.error("Failed to save", e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Document Details - ${document.document_type}`} size="4xl">
      <div className="flex h-[75vh] divide-x divide-[var(--color-border)]">
        {/* Left: Document View */}
        <div className="w-1/2 p-4 overflow-hidden flex flex-col">
          <FileView url={document.file_url} mimeType={document.file_mime_type} />
        </div>

        {/* Right: Data Review */}
        <div className="w-1/2 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            <ExtractionReview
              docType={document.document_type}
              data={data}
              confidence={document.field_confidence || {}}
              onChange={(newData: Record<string, any>) => setData(prev => ({ ...prev, ...newData }))}
            />
          </div>

          <div className="p-4 border-t border-[var(--color-border)] flex justify-between items-center bg-white">
            <Button 
              variant="outline" 
              onClick={() => {
                const link = window.document.createElement('a');
                link.href = document.file_url;
                link.target = '_blank';
                link.setAttribute('download', `document_${document.id}`);
                window.document.body.appendChild(link);
                link.click();
                window.document.body.removeChild(link);
              }}
            >
              Download Original
            </Button>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose}>Close</Button>
              <Button onClick={handleSave} loading={saving}>Save Changes</Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
