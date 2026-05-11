"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { X, ShieldAlert, Send, SkipForward, Mic, Square, Keyboard, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { crisisApi } from "@/lib/api/crisis";
import { EmergencyContactList } from "./EmergencyContactList";
import { CrisisMedList } from "./CrisisMedList";
import { CrisisLabList } from "./CrisisLabList";
import { CrisisDoctorList } from "./CrisisDoctorList";
import { FreshnessNote } from "./FreshnessNote";
import { useCrisis } from "@/hooks/useCrisis";
import { documentsApi } from "@/lib/api/documents";

interface Props {
  open: boolean;
  patientId: string;
  onClose: () => void;
  onExited?: () => void;
}

type Step = "crisis" | "followup";
type FollowupMode = "text" | "voice";

function preferredMime() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return types.find(t => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function CrisisModal({ open, patientId, onClose, onExited }: Props) {
  const { packet, loading, error, enter, exit } = useCrisis();
  const [step, setStep] = useState<Step>("crisis");
  const [followupMode, setFollowupMode] = useState<FollowupMode>("text");
  const [followUpText, setFollowUpText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Fix 2: double-exit guard
  const exitingRef = useRef(false);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (open && patientId) {
      enter(patientId, "button_tap");
      setStep("crisis");
      setFollowUpText("");
      setFollowupMode("text");
      setAudioBlob(null);
      setAudioBlobUrl(null);
      exitingRef.current = false; // reset guard on each open
    }
  }, [open, patientId, enter]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Voice recording
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = preferredMime();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioBlobUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      // mic permission denied
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    mediaRef.current = null;
    setRecording(false);
  }

  // Core exit — guarded against double calls
  const doExit = useCallback(async (text?: string, blob?: Blob | null) => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setSubmitting(true);

    try {
      // Upload voice blob if recorded
      if (blob) {
        try {
          const mime = blob.type || "audio/webm";
          const ext = mime.includes("mp4") ? "mp4" : "webm";
          const { upload_url, document_id } = await documentsApi.getUploadUrl(patientId, {
            document_type: "voice_note",
            ingestion_source: "app_upload",
            file_mime_type: mime,
            file_size_bytes: blob.size,
          });
          await documentsApi.uploadToStorage(upload_url, blob, mime);
          await documentsApi.triggerExtraction(document_id);
        } catch {
          // non-critical — continue even if upload fails
        }
      }

      // Submit follow-up note
      const noteText = text?.trim() || (blob ? "[Voice note recorded during emergency follow-up]" : "");
      if (noteText) {
        await crisisApi.followUp(patientId, noteText);
      }
    } catch {
      // best-effort
    }

    // Close immediately — exit API is fire-and-forget (just logs notification)
    setSubmitting(false);
    onClose();
    onExited?.();
    exit(patientId).catch(() => {});
  }, [patientId, exit, onClose, onExited]);

  const handleSkipFollowUp = useCallback(async () => {
    await doExit();
  }, [doExit]);

  const handleExitClick = useCallback(() => handleSkipFollowUp(), [handleSkipFollowUp]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const { signed_url } = await crisisApi.getPdf(patientId);
      const a = document.createElement("a");
      a.href = signed_url;
      a.download = "emergency-card.pdf";
      a.target = "_blank";
      a.rel = "noopener";
      a.click();
    } catch {
      // silent fail — user can retry
    } finally {
      setDownloading(false);
    }
  }, [patientId]);

  const handleSubmitFollowUp = useCallback(async () => {
    await doExit(followUpText, audioBlob);
  }, [followUpText, audioBlob, doExit]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkipFollowUp();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, handleSkipFollowUp]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkipFollowUp} aria-hidden="true" />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[var(--color-alert)] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white">
            <ShieldAlert size={22} />
            <h2 className="text-lg font-bold">
              {step === "crisis" ? "Emergency Mode" : "What happened?"}
            </h2>
          </div>
          <button
            onClick={handleSkipFollowUp}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ── Step 1: Crisis packet ── */}
          {step === "crisis" && (
            <>
              {loading && (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 rounded-lg bg-[var(--color-border)] animate-pulse" />
                  ))}
                </div>
              )}
              {error && <p className="text-sm text-[var(--color-alert)]">{error}</p>}
              {packet && (
                <>
                  {(packet.patient_name || packet.patient_dob || packet.blood_type || packet.known_conditions.length > 0) && (
                    <div className="bg-slate-50 rounded-xl px-4 py-3 border border-[var(--color-border)] space-y-2">
                      <div className="flex items-center gap-6 flex-wrap">
                        {packet.patient_name && (
                          <div>
                            <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Patient</p>
                            <p className="text-sm font-bold text-[var(--color-text)]">{packet.patient_name}</p>
                          </div>
                        )}
                        {packet.patient_dob && (
                          <div>
                            <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Date of Birth</p>
                            <p className="text-sm font-bold text-[var(--color-text)]">{packet.patient_dob}</p>
                          </div>
                        )}
                        {packet.blood_type && (
                          <div>
                            <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Blood Type</p>
                            <p className="text-sm font-bold text-blue-700">{packet.blood_type}</p>
                          </div>
                        )}
                      </div>
                      {packet.known_conditions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {packet.known_conditions.map(c => (
                            <span key={c} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <EmergencyContactList contacts={packet.emergency_contacts} nearestEmergency={packet.nearest_emergency} />
                  <CrisisMedList medications={packet.medications} allergies={packet.known_allergies} bloodType={packet.blood_type} activeAlerts={packet.active_alerts} />
                  {packet.known_conditions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">Known Conditions</h4>
                      <div className="flex flex-wrap gap-2">
                        {packet.known_conditions.map(c => (
                          <span key={c} className="bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-xs font-medium">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <CrisisLabList results={packet.lab_results} />
                  <CrisisDoctorList doctors={packet.prescribers} />
                  {packet.last_cardiac_event && (
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">Last Cardiac Event</h4>
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                        <p className="text-[10px] font-bold text-amber-800 uppercase mb-1">{packet.last_cardiac_event.date}</p>
                        <p className="text-sm text-amber-900 leading-relaxed">{packet.last_cardiac_event.summary}</p>
                      </div>
                    </div>
                  )}
                  <FreshnessNote note={packet.freshness_note} isCurrent={packet.is_current} />
                </>
              )}
            </>
          )}

          {/* ── Step 2: Follow-up ── */}
          {step === "followup" && (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-orange-800 mb-1">Emergency card was accessed</p>
                <p className="text-xs text-orange-700 leading-relaxed">
                  Describe what happened so we can update the record. You can type or record a voice note.
                </p>
              </div>

              {/* Mode tabs */}
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setFollowupMode("text")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    followupMode === "text" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  <Keyboard size={13} />
                  Type
                </button>
                <button
                  onClick={() => setFollowupMode("voice")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    followupMode === "voice" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  <Mic size={13} />
                  Voice
                </button>
              </div>

              {/* Text mode */}
              {followupMode === "text" && (
                <div>
                  <textarea
                    value={followUpText}
                    onChange={e => setFollowUpText(e.target.value)}
                    placeholder="e.g. Papa had chest pain, called ambulance, now stable in hospital..."
                    className="w-full h-28 px-3 py-2 text-sm border border-[var(--color-border)] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-action)] placeholder:text-[var(--color-muted)]"
                    autoFocus
                  />
                  <p className="text-xs text-[var(--color-muted)] mt-1">{followUpText.length}/500 characters</p>
                </div>
              )}

              {/* Voice mode */}
              {followupMode === "voice" && (
                <div className="flex flex-col items-center gap-4 py-4">
                  {!audioBlob ? (
                    <>
                      <button
                        onClick={recording ? stopRecording : startRecording}
                        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
                          recording
                            ? "bg-red-500 hover:bg-red-600 animate-pulse"
                            : "bg-[var(--color-alert)] hover:opacity-90"
                        }`}
                      >
                        {recording ? <Square size={28} className="text-white" fill="white" /> : <Mic size={28} className="text-white" />}
                      </button>
                      <p className="text-sm text-slate-500 font-medium">
                        {recording ? "Recording… tap to stop" : "Tap to start recording"}
                      </p>
                    </>
                  ) : (
                    <div className="w-full space-y-3">
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <Mic size={16} className="text-green-500" />
                        <span className="text-sm text-green-700 font-medium">Voice note recorded</span>
                      </div>
                      <audio src={audioBlobUrl!} controls className="w-full rounded-xl" />
                      <button
                        onClick={() => { setAudioBlob(null); setAudioBlobUrl(null); }}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Re-record
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] shrink-0">
          {step === "crisis" && (
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1 gap-2"
                onClick={handleDownload}
                disabled={downloading}
                loading={downloading}
              >
                <Download size={15} />
                {downloading ? "Generating…" : "Download PDF"}
              </Button>
              <Button variant="ghost" className="flex-1" onClick={handleExitClick}>
                Exit
              </Button>
            </div>
          )}
          {step === "followup" && (
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 gap-2" onClick={handleSkipFollowUp} disabled={submitting}>
                <SkipForward size={15} />
                Skip
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleSubmitFollowUp}
                disabled={(!followUpText.trim() && !audioBlob) || submitting}
                loading={submitting}
              >
                <Send size={15} />
                {submitting ? "Saving..." : "Submit"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
