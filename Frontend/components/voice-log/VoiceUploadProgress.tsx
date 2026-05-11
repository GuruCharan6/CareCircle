"use client";

import { cn } from "@/lib/utils";
import type { VoicePhase } from "@/hooks/useVoiceLog";

interface VoiceUploadProgressProps {
  phase: VoicePhase;
}

const PHASE_LABEL: Record<VoicePhase, string> = {
  idle:       "",
  requesting: "Initializing microphone…",
  recording:  "Recording Live",
  uploading:  "Securing audio upload…",
  polling:    "AI is transcribing…",
  review:     "Transcription ready",
  done:       "Successfully saved",
  error:      "Upload failed",
};

const ACTIVE_PHASES: VoicePhase[] = ["requesting", "uploading", "polling"];

export function VoiceUploadProgress({ phase }: VoiceUploadProgressProps) {
  const label = PHASE_LABEL[phase];
  if (!label) return null;

  const isActive = ACTIVE_PHASES.includes(phase);
  const isError = phase === "error";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn(
        "flex items-center gap-2 text-xs font-semibold uppercase tracking-wider",
        isError ? "text-red-500" : "text-[var(--color-muted)]"
      )}>
        {isActive && (
          <span className="w-2.5 h-2.5 rounded-full border-2 border-[var(--color-action)] border-t-transparent animate-spin shrink-0" />
        )}
        {isError && (
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
        )}
        <span>{label}</span>
      </div>
    </div>
  );
}
