"use client";

import { useState, useRef } from "react";
import { X, ShieldAlert, Send, SkipForward, Mic, Square, Keyboard, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { crisisApi } from "@/lib/api/crisis";
import { documentsApi } from "@/lib/api/documents";

interface Props {
  open: boolean;
  onClose: () => void;
  patientId: string;
  notificationId?: string;
}

type Mode = "text" | "voice";

function preferredMime() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return types.find(t => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function CrisisFollowUpModal({ open, onClose, patientId }: Props) {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
    } catch {}
  }

  function stopRecording() {
    mediaRef.current?.stop();
    mediaRef.current = null;
    setRecording(false);
  }

  async function handleSubmit() {
    if (!text.trim() && !audioBlob) return;
    setSubmitting(true);
    try {
      if (audioBlob) {
        try {
          const mime = audioBlob.type || "audio/webm";
          const { upload_url, document_id } = await documentsApi.getUploadUrl(patientId, {
            document_type: "voice_note",
            ingestion_source: "crisis_follow_up",
            file_mime_type: mime,
            file_size_bytes: audioBlob.size,
          });
          await documentsApi.uploadToStorage(upload_url, audioBlob, mime);
          await documentsApi.triggerExtraction(document_id);
        } catch {}
      }
      const noteText = text.trim() || "[Voice note recorded for emergency follow-up]";
      await crisisApi.followUp(patientId, noteText);
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setText("");
        setAudioBlob(null);
        setAudioBlobUrl(null);
        onClose();
      }, 1500);
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (recording) stopRecording();
    setText("");
    setAudioBlob(null);
    setAudioBlobUrl(null);
    setDone(false);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header — matches CrisisModal step 2 */}
        <div className="bg-[var(--color-alert)] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white">
            <ShieldAlert size={22} />
            <h2 className="text-lg font-bold">What happened?</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 size={40} className="text-green-500" />
              <p className="text-sm font-semibold text-slate-700">Note saved successfully</p>
            </div>
          ) : (
            <>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-orange-800 mb-1">Emergency card was accessed</p>
                <p className="text-xs text-orange-700 leading-relaxed">
                  Describe what happened so we can update the record. You can type or record a voice note.
                </p>
              </div>

              {/* Mode tabs */}
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setMode("text")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    mode === "text" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  <Keyboard size={13} />
                  Type
                </button>
                <button
                  onClick={() => setMode("voice")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    mode === "voice" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  <Mic size={13} />
                  Voice
                </button>
              </div>

              {/* Text mode */}
              {mode === "text" && (
                <div>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="e.g. Papa had chest pain, called ambulance, now stable in hospital..."
                    className="w-full h-28 px-3 py-2 text-sm border border-[var(--color-border)] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-action)] placeholder:text-[var(--color-muted)]"
                    autoFocus
                  />
                  <p className="text-xs text-[var(--color-muted)] mt-1">{text.length}/500 characters</p>
                </div>
              )}

              {/* Voice mode */}
              {mode === "voice" && (
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
            </>
          )}
        </div>

        {/* Footer — matches CrisisModal step 2 */}
        {!done && (
          <div className="px-6 py-4 border-t border-[var(--color-border)]">
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 gap-2" onClick={handleClose} disabled={submitting}>
                <SkipForward size={15} />
                Skip
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleSubmit}
                disabled={(!text.trim() && !audioBlob) || submitting}
                loading={submitting}
              >
                <Send size={15} />
                {submitting ? "Saving..." : "Submit"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
