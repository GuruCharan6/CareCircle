"use client";

import React from "react";
import { usePatient } from "@/hooks/usePatient";
import { useDocuments } from "@/hooks/useDocuments";
import { useVoiceLog } from "@/hooks/useVoiceLog";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { UploadZone } from "@/components/documents/UploadZone";
import { ApprovalModal } from "@/components/documents/ApprovalModal";
import { VoiceRecordButton } from "@/components/voice-log/VoiceRecordButton";
import { RecordingWave } from "@/components/voice-log/RecordingWave";
import { VoiceUploadProgress } from "@/components/voice-log/VoiceUploadProgress";
import { VoiceApprovalModal } from "@/components/voice-log/VoiceApprovalModal";
import type { DocumentType } from "@/lib/types";

export default function UploadPage() {
  const { activePatient } = usePatient();
  const {
    uploadState, uploadLoading, upload, approve, reject, updateExtractedData, clearUpload,
  } = useDocuments();
  const {
    phase, duration, voiceState,
    startRecording, stopRecording, approve: approveVoice, reject: rejectVoice, reset: resetVoice,
    updateExtractedText, updateExtractedField,
  } = useVoiceLog();

  async function handleUpload(file: File, docType: DocumentType, contentHash?: string) {
    if (!activePatient) return;
    await upload(activePatient.id, file, docType, contentHash);
  }

  function handleStartRecording() {
    if (activePatient) startRecording(activePatient.id);
  }

  if (!activePatient) {
    return <p className="text-[var(--color-muted)] text-sm">No patient selected.</p>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-primary)]">Upload & Capture</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* File upload */}
        <div className="col-span-1 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload document</CardTitle>
            </CardHeader>
            <div className="p-4">
              <UploadZone onUpload={handleUpload} loading={uploadLoading} />
            </div>

            {/* Upload progress / review feedback */}
            {uploadState && uploadState.status !== "approved" && uploadState.status !== "rejected" && (
              <div className="mt-4 p-3 m-4 rounded-lg bg-[var(--color-surface)] flex items-center gap-2">
                <span className="text-xs text-[var(--color-muted)] font-medium uppercase tracking-wide">
                  {uploadState.status === "pending" && "Queued for extraction…"}
                  {uploadState.status === "extracting" && (
                    <span className="flex items-center gap-2 text-[var(--color-watch)]">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-watch)] animate-pulse" />
                      AI is extracting data…
                    </span>
                  )}
                  {uploadState.status === "review_required" && "Extraction complete! Review required below ↓"}
                  {uploadState.status === "failed" && (
                    <span className="text-[var(--color-alert)]">
                      Failed: {uploadState.error ?? "Unknown error"}
                    </span>
                  )}
                </span>
              </div>
            )}
          </Card>
        </div>

        {/* Voice log */}
        <Card className="flex flex-col items-center justify-center gap-24 py-20 bg-gradient-to-br from-white to-[var(--color-surface)]">
          <CardTitle className="text-center text-[var(--color-primary)]">Voice Log</CardTitle>

          <div className="flex flex-col items-center gap-6">
            <VoiceRecordButton
              phase={phase}
              duration={duration}
              onStart={handleStartRecording}
              onStop={stopRecording}
            />
            {phase === "recording" && <RecordingWave duration={duration} />}
            <div className="mt-2">
              <VoiceUploadProgress phase={phase} />
            </div>
            {(phase === "done" || phase === "error") && (
              <button
                onClick={resetVoice}
                className="text-xs font-semibold text-[var(--color-action)] hover:underline"
              >
                Record another
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* Modals for Review */}
      {uploadState && (
        <ApprovalModal
          open={uploadState.status === "review_required"}
          onClose={clearUpload}
          uploadState={uploadState}
          onApprove={approve}
          onReject={reject}
          onUpdate={updateExtractedData}
        />
      )}

      {voiceState && (
        <VoiceApprovalModal
          open={phase === "review"}
          onClose={resetVoice}
          voiceState={voiceState}
          onApprove={approveVoice}
          onReject={rejectVoice}
          onTextChange={updateExtractedText}
          onFieldChange={updateExtractedField}
        />
      )}
    </div>
  );
}
