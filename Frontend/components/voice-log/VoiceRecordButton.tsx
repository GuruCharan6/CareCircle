"use client";

import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VoicePhase } from "@/hooks/useVoiceLog";

interface VoiceRecordButtonProps {
  phase: VoicePhase;
  duration: number;
  onStart: () => void;
  onStop: () => void;
  className?: string;
}

export function VoiceRecordButton({ phase, duration, onStart, onStop, className }: VoiceRecordButtonProps) {
  const mins = String(Math.floor(duration / 60)).padStart(2, "0");
  const secs = String(duration % 60).padStart(2, "0");

  const isRecording = phase === "recording";
  const isBusy = ["requesting", "uploading", "polling"].includes(phase);
  const isDisabled = isBusy || phase === "review" || phase === "done";

  function handleClick() {
    if (isRecording) onStop();
    else if (phase === "idle" || phase === "error") onStart();
  }

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer Pulse Rings (Only when recording) */}
      {isRecording && (
        <>
          <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20 scale-150" />
          <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-10 scale-[2] delay-300" />
        </>
      )}

      <button
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        className={cn(
          "relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-action)]/20",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "shadow-lg active:scale-95",
          isRecording
            ? "bg-gradient-to-tr from-red-600 to-red-400 shadow-red-200"
            : "bg-gradient-to-tr from-[var(--color-action)] to-[#22c55e] shadow-[var(--color-action)]/20"
        )}
      >
        {isBusy ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin h-7 w-7 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : isRecording ? (
          <div className="bg-white rounded-md w-5 h-5 shadow-sm" />
        ) : (
          <Mic size={28} className="text-white drop-shadow-sm" />
        )}

        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-full opacity-40 blur-md -z-10 transition-colors duration-500",
          isRecording ? "bg-red-400" : "bg-emerald-400"
        )} />
      </button>

    </div>
  );
}
