"use client";

import { useState, useCallback, useRef } from "react";
import { documentsApi } from "@/lib/api/documents";
import type {
  DocumentListItem,
  DocumentResponse,
  DocumentType,
  ExtractionStatus,
} from "@/lib/types";

export interface UploadState {
  docId: string;
  docType: DocumentType;
  status: ExtractionStatus;
  extractedData: Record<string, unknown> | null;
  fieldConfidence: Record<string, number> | null;
  extractedText: string | null;
  eventDate: string | null;
  error: string | null;
}

const POLL_DONE: ExtractionStatus[] = ["review_required", "approved", "rejected", "failed"];
const POLL_INTERVAL_MS = 3000;

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentResponse | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling(docId: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const doc: DocumentResponse = await documentsApi.get(docId);
        setUploadState(prev =>
          prev ? {
            ...prev,
            status: doc.extraction_status,
            extractedData: doc.extracted_data,
            fieldConfidence: doc.field_confidence,
            extractedText: doc.extracted_text,
            eventDate: doc.event_date,
          } : null
        );
        if (POLL_DONE.includes(doc.extraction_status)) stopPolling();
      } catch {
        // Keep polling on transient errors
      }
    }, POLL_INTERVAL_MS);
  }

  const fetchDocuments = useCallback(async (patientId: string) => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await documentsApi.list(patientId);
      setDocuments(data);
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setListLoading(false);
    }
  }, []);

  const upload = useCallback(async (
    patientId: string,
    file: File,
    docType: DocumentType,
    contentHash?: string
  ) => {
    setUploadLoading(true);
    setUploadState(null);
    try {
      // Step 1: get signed URL
      const { upload_url, document_id } = await documentsApi.getUploadUrl(patientId, {
        document_type: docType,
        ingestion_source: "app_upload",
        file_mime_type: file.type,
        file_size_bytes: file.size,
        content_hash: contentHash,
      });

      // Step 2: PUT to Supabase (no auth header)
      await documentsApi.uploadToStorage(upload_url, file, file.type);

      // Set state to extracting so UI shows progress during the sync call
      setUploadState({
        docId: document_id,
        docType,
        status: "extracting",
        extractedData: null,
        fieldConfidence: null,
        extractedText: null,
        eventDate: null,
        error: null,
      });

      // Step 3: Trigger AI extraction in backend (now synchronous)
      const result: DocumentResponse = await documentsApi.triggerExtraction(document_id);

      setUploadState({
        docId: document_id,
        docType,
        status: result.extraction_status,
        extractedData: result.extracted_data,
        fieldConfidence: result.field_confidence,
        extractedText: result.extracted_text,
        eventDate: result.event_date,
        error: null,
      });

      // Start polling just in case any background logic is still finishing
      startPolling(document_id);
    } catch (e: unknown) {
      setUploadState({
        docId: "",
        docType,
        status: "failed",
        extractedData: null,
        fieldConfidence: null,
        extractedText: null,
        eventDate: null,
        error: e instanceof Error ? e.message : "Upload failed",
      });
    } finally {
      setUploadLoading(false);
    }
  }, []);

  const approve = useCallback(async (docId: string, data?: Record<string, any>) => {
    const state = uploadState;
    await documentsApi.approve(docId, {
      extracted_data: data ?? state?.extractedData ?? {},
      extracted_text: state?.extractedText ?? undefined,
      event_date: state?.eventDate ?? undefined,
      document_type: state?.docType ?? undefined,
    });
    setUploadState(prev => prev ? { ...prev, status: "approved" } : null);
  }, [uploadState]);

  const reject = useCallback(async (docId: string, reason: string) => {
    await documentsApi.reject(docId, { rejection_reason: reason });
    setUploadState(prev => prev ? { ...prev, status: "rejected" } : null);
  }, []);

  const updateExtractedData = useCallback((data: Record<string, any>) => {
    setUploadState(prev => prev ? { ...prev, extractedData: { ...(prev.extractedData || {}), ...data } } : null);
  }, []);

  const clearUpload = useCallback(() => {
    stopPolling();
    setUploadState(null);
  }, []);

  const selectDocument = useCallback(async (docId: string) => {
    setDetailLoading(true);
    try {
      const doc = await documentsApi.get(docId);
      setSelectedDocument(doc);
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : "Failed to load document details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedDocument(null);
  }, []);

  const remove = useCallback(async (docId: string) => {
    try {
      await documentsApi.delete(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : "Failed to delete document");
    }
  }, []);

  const reprocess = useCallback(async (docId: string) => {
    if (!docId) return;
    setUploadLoading(true);
    setUploadState(prev => prev ? { ...prev, status: "extracting", extractedData: null, fieldConfidence: null } : null);
    try {
      const result: DocumentResponse = await documentsApi.triggerExtraction(docId);
      setUploadState(prev => prev ? {
        ...prev,
        status: result.extraction_status,
        extractedData: result.extracted_data,
        fieldConfidence: result.field_confidence,
        extractedText: result.extracted_text,
        eventDate: result.event_date,
        error: null,
      } : null);
      startPolling(docId);
    } catch (e: unknown) {
      setUploadState(prev => prev ? { ...prev, status: "failed", error: e instanceof Error ? e.message : "Re-extraction failed" } : null);
    } finally {
      setUploadLoading(false);
    }
  }, []);

  const updateDocumentData = useCallback(async (docId: string, data: any) => {
    try {
      const updated = await documentsApi.update(docId, { extracted_data: data });
      setSelectedDocument(updated);
      setDocuments(prev => prev.map(d => d.id === docId ? { 
        ...d, 
        extracted_data: updated.extracted_data,
        extraction_status: updated.extraction_status 
      } : d));
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : "Failed to update document");
      throw e;
    }
  }, []);

  return {
    documents,
    uploadState,
    selectedDocument,
    listLoading,
    uploadLoading,
    detailLoading,
    listError,
    fetchDocuments,
    upload,
    approve,
    reject,
    reprocess,
    updateExtractedData,
    clearUpload,
    selectDocument,
    closeDetail,
    remove,
    updateDocumentData,
  };
}
