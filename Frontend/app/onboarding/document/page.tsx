"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { UploadZone } from "@/components/documents/UploadZone";
import { DocStatusBadge } from "@/components/documents/DocStatusBadge";
import { onboardingApi } from "@/lib/api/onboarding";
import { useDocuments } from "@/hooks/useDocuments";
import { usePatient } from "@/hooks/usePatient";
import { ApprovalModal } from "@/components/documents/ApprovalModal";
import type { DocumentType } from "@/lib/types";

export default function OnboardingDocumentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isEdit = mode === "edit";

  const { activePatient } = usePatient();
  const { uploadState, uploadLoading, upload, approve, reject, updateExtractedData, clearUpload } = useDocuments();
  const [skipping, setSkipping] = useState(false);
  const [showReview, setShowReview] = useState(false);

  async function handleUpload(file: File, docType: DocumentType, contentHash?: string) {
    if (!activePatient) return;
    await upload(activePatient.id, file, docType, contentHash);
    setShowReview(true);
  }

  async function handleSkip() {
    setSkipping(true);
    await onboardingApi.completeStep(2).catch(() => {});
    const nextUrl = isEdit ? "/onboarding/digest?mode=edit" : "/onboarding/digest";
    router.push(nextUrl);
  }

  async function handleContinue() {
    await onboardingApi.completeStep(2).catch(() => {});
    const nextUrl = isEdit ? "/onboarding/digest?mode=edit" : "/onboarding/digest";
    router.push(nextUrl);
  }

  const uploaded = uploadState && ["extracting", "review_required", "approved", "pending"].includes(uploadState.status);
  const needsReview = uploadState?.status === "review_required";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-primary)]">
          {isEdit ? "Upload Documents" : "Step 2 of 5 — First document"}
        </h2>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          {isEdit ? "Add more prescriptions or lab reports to the profile." : "Upload a prescription or lab report to get started. You can add more later."}
        </p>
      </div>

      <UploadZone onUpload={handleUpload} loading={uploadLoading} />

      {uploadState && (
        <div className="flex flex-col gap-3 p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              Extraction status: <DocStatusBadge status={uploadState.status} />
            </div>
            {needsReview && (
              <Button size="sm" onClick={() => setShowReview(true)}>
                Review Details
              </Button>
            )}
          </div>
          
          {uploadState.status === "extracting" && (
            <p className="text-xs text-[var(--color-muted)] animate-pulse">
              AI is analyzing your document... this usually takes 5-10 seconds.
            </p>
          )}
        </div>
      )}

      {uploadState && showReview && (
        <ApprovalModal
          open={showReview}
          onClose={() => setShowReview(false)}
          uploadState={uploadState}
          onApprove={approve}
          onReject={reject}
          onUpdate={updateExtractedData}
        />
      )}

      <div className="flex gap-3">
        <Button
          variant="primary"
          className="w-full h-12 text-sm font-bold"
          onClick={handleContinue}
          disabled={uploadLoading || (uploadState?.status !== "approved")}
        >
          {uploaded 
            ? (uploadState?.status === "approved" ? "Continue to Digest →" : "Please Approve Extraction") 
            : "Upload Document to Continue"}
        </Button>
      </div>
    </div>
  );
}
