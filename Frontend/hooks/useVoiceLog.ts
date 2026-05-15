"use client";

import { useState, useCallback, useRef } from "react";
import { documentsApi } from "@/lib/api/documents";
import type { DocumentResponse, ExtractionStatus, IngestionSource } from "@/lib/types";

export type VoicePhase =
  | "idle"
  | "requesting"
  | "recording"
  | "uploading"
  | "polling"
  | "review"
  | "done"
  | "error";

export interface VoiceUploadState {
  docId: string;
  status: ExtractionStatus;
  extractedText: string | null;
  extractedData: Record<string, unknown> | null;
  fieldConfidence: Record<string, number> | null;
  transcriptionFailed?: boolean;
}

const POLL_DONE: ExtractionStatus[] = ["review_required", "approved", "rejected", "failed"];
const POLL_INTERVAL_MS = 3000;

function preferredMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return types.find(t => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function useVoiceLog() {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [duration, setDuration] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceUploadState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function stopPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  function startPolling(docId: string) {
    stopPoll();
    setPhase("polling");
    pollRef.current = setInterval(async () => {
      try {
        const doc: DocumentResponse = await documentsApi.get(docId);
        setVoiceState(prev => prev ? {
          ...prev,
          status: doc.extraction_status,
          extractedText: doc.extracted_text,
          extractedData: doc.extracted_data,
          fieldConfidence: doc.field_confidence,
        } : null);

        if (POLL_DONE.includes(doc.extraction_status)) {
          stopPoll();
          if (doc.extraction_status === "review_required") {
            setPhase("review");
          } else if (doc.extraction_status === "failed") {
            // Still show review modal — user can type transcript manually and save
            setVoiceState(prev => prev ? { ...prev, transcriptionFailed: true } : null);
            setPhase("review");
          } else if (doc.extraction_status === "approved" || doc.extraction_status === "rejected") {
            setPhase("done");
          }
        }
      } catch {
        // Keep polling on transient error
      }
    }, POLL_INTERVAL_MS);
  }

  const startRecording = useCallback(async (patientId: string, ingestionSource: IngestionSource = "app_upload") => {
    setPhase("requesting");
    setError(null);
    setVoiceState(null);
    setDuration(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stopStream();
        stopTimer();
        setPhase("uploading");

        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        // Use audio/mpeg for maximum compatibility with Storage bucket policies
        const resolvedMime = "audio/mpeg";

        try {
          const { upload_url, document_id } = await documentsApi.getUploadUrl(patientId, {
            document_type: "voice_note",
            ingestion_source: ingestionSource,
            file_mime_type: resolvedMime,
            file_size_bytes: blob.size,
          });

          await documentsApi.uploadToStorage(upload_url, blob, resolvedMime);
          
          setVoiceState({
            docId: document_id,
            status: "pending",
            extractedText: null,
            extractedData: null,
            fieldConfidence: null,
          });

          // Transition to polling phase immediately after upload
          startPolling(document_id);

          // Trigger AI extraction in the background
          try {
            await documentsApi.triggerExtraction(document_id);
          } catch (err) {
            console.error("Extraction trigger failed (this is usually okay if polling is active):", err);
          }
        } catch (e: unknown) {
          setPhase("error");
          const msg = e instanceof Error ? e.message : "Upload failed";
          setError(msg);
          console.error("Voice upload error:", e);
        }
      };

      recorder.start(1000); // collect chunks every 1s
      setPhase("recording");

      timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);
    } catch (e: unknown) {
      setPhase("error");
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Microphone permission denied"
          : "Failed to start recording"
      );
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const approve = useCallback(async () => {
    if (!voiceState) return;
    await documentsApi.approve(voiceState.docId, {
      extracted_data: voiceState.extractedData ?? {},
      extracted_text: voiceState.extractedText ?? undefined,
    });
    setVoiceState(prev => prev ? { ...prev, status: "approved" } : null);
    setPhase("done");
  }, [voiceState]);

  const reject = useCallback(async (reason = "Not accurate") => {
    if (!voiceState) return;
    await documentsApi.reject(voiceState.docId, { rejection_reason: reason });
    setVoiceState(prev => prev ? { ...prev, status: "rejected" } : null);
    setPhase("done");
  }, [voiceState]);

  const reset = useCallback(() => {
    stopPoll();
    stopTimer();
    stopStream();
    setPhase("idle");
    setDuration(0);
    setVoiceState(null);
    setError(null);
    chunksRef.current = [];
  }, []);

  const updateExtractedText = useCallback((text: string) => {
    setVoiceState(prev => prev ? { ...prev, extractedText: text } : null);
  }, []);

  const updateExtractedField = useCallback((key: string, value: unknown) => {
    setVoiceState(prev => prev ? {
      ...prev,
      extractedData: { ...(prev.extractedData ?? {}), [key]: value },
    } : null);
  }, []);

  return {
    phase,
    duration,
    voiceState,
    error,
    startRecording,
    stopRecording,
    approve,
    reject,
    reset,
    updateExtractedText,
    updateExtractedField,
  };
}
