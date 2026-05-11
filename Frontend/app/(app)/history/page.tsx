"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { usePatient } from "@/hooks/usePatient";
import { useHistory } from "@/hooks/useHistory";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  History, Pill, FlaskConical, FileText,
  MessageSquare, Users, Download, Calendar, Siren,
  Mic, Play, Pause, ChevronDown, ChevronUp, AlertCircle, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSearchParams, useRouter } from "next/navigation";

// ── Inline audio player (same pattern as ObservationCard) ─────────────────────

function formatTime(sec: number): string {
  if (!isFinite(sec) || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function AudioPlayer({ rawUrl }: { rawUrl: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const blobRef  = useRef<string | null>(null);
  const [blobUrl, setBlobUrl]     = useState<string | null>(null);
  const [fetching, setFetching]   = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [playing, setPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]   = useState(0);

  useEffect(() => {
    let active = true;
    setFetching(true);
    setLoadError(false);
    setBlobUrl(null);

    fetch(rawUrl)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); })
      .then(blob => {
        if (!active) return;
        const url = URL.createObjectURL(blob);
        blobRef.current = url;
        setBlobUrl(url);
      })
      .catch(() => { if (active) setBlobUrl(rawUrl); })
      .finally(() => { if (active) setFetching(false); });

    return () => {
      active = false;
      if (blobRef.current && blobRef.current !== rawUrl) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [rawUrl]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause(); else el.play().catch(() => setLoadError(true));
  }, [playing]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 mt-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-1.5">
        <Mic size={10} className={fetching ? "animate-pulse" : ""} />
        Voice Recording
      </p>
      {fetching ? (
        <div className="flex items-center gap-2 text-xs text-blue-400">
          <Loader2 size={14} className="animate-spin" /> Loading audio…
        </div>
      ) : loadError ? (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <AlertCircle size={14} /> Could not load audio
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm"
          >
            {playing ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
          </button>
          <div className="flex-1 space-y-1.5">
            <div className="h-1.5 bg-blue-200 rounded-full cursor-pointer relative overflow-hidden" onClick={handleSeek}>
              <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-blue-400 font-medium">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}
      {blobUrl && (
        <audio
          ref={audioRef}
          src={blobUrl}
          preload="auto"
          className="hidden"
          onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
          onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
          onEnded={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setLoadError(true)}
        />
      )}
    </div>
  );
}

function TimelineCard({ item, initialExpanded = false }: { item: any, initialExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(initialExpanded);
  
  useEffect(() => {
    if (initialExpanded) setExpanded(true);
  }, [initialExpanded]);

  const isExpandable = (item.type === "voice" || item.type === "document") && (item.audio_url || item.transcript);

  return (
    <Card
      className={`border-0 shadow-sm bg-white transition-shadow ${isExpandable ? "cursor-pointer hover:shadow-md" : ""}`}
      padding="md"
      onClick={isExpandable ? () => setExpanded(e => !e) : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[var(--color-text)]">{item.title}</h3>
          <p className="text-xs text-[var(--color-muted)] font-medium mt-0.5">{item.subtitle}</p>
          {item.summary && (
            <p className="text-sm text-[var(--color-text-light)] mt-3 border-t border-slate-50 pt-2 leading-relaxed">
              {item.summary}
            </p>
          )}
        </div>
        {isExpandable && (
          <div className="shrink-0 text-slate-300 mt-0.5">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        )}
      </div>

      {/* Expanded: audio + transcript */}
      {expanded && (
        <div className="space-y-3 mt-3 pt-3 border-t border-slate-50" onClick={e => e.stopPropagation()}>
          {item.audio_url && <AudioPlayer rawUrl={item.audio_url} />}
          {item.transcript && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Transcript</p>
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3.5">
                <p className="text-sm text-slate-600 leading-relaxed italic">
                  &ldquo;{item.transcript}&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed hint for expandable items */}
      {!expanded && isExpandable && item.audio_url && (
        <p className="text-xs text-blue-500 font-medium mt-2 flex items-center gap-1">
          <Mic size={11} /> Tap to listen &amp; view transcript
        </p>
      )}
    </Card>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get("id");
  const { activePatient } = usePatient();
  const { history, loading, fetch, getPdfUrl } = useHistory();
  const [downloading, setDownloading] = useState(false);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Flatten and sort history items for the timeline
  const timelineItems = React.useMemo(() => {
    if (!history) return [];
    
    const items: any[] = [];
    
    // Deduplicate observations (handle the UNION ALL from repo which might have raw + processed)
    const uniqueObs = (history.observations || []).reduce((acc: any[], current: any) => {
      const sourceId = current.source_document_id || current.id;
      const existingIdx = acc.findIndex(o => (o.source_document_id || o.id) === sourceId);
      
      if (existingIdx > -1) {
        // If we found a match, check if current is a "better" version (processed observation)
        const currentIsObs = current.source_document_id && current.id !== current.source_document_id;
        const existingIsObs = acc[existingIdx].source_document_id && acc[existingIdx].id !== acc[existingIdx].source_document_id;
        
        if (currentIsObs && !existingIsObs) {
          acc[existingIdx] = current;
        }
      } else {
        acc.push(current);
      }
      return acc;
    }, []);

    // Add unique observations
    uniqueObs.forEach((o: any) => {
      const source = o.source_label || "User Update";
      const isEmergency = o.source_type === "emergency_note" || source === "Emergency Voice Note";

      items.push({
        id: o.id,
        source_document_id: o.source_document_id,
        type: "voice",
        date: o.observation_date || o.created_at,
        title: isEmergency
          ? "Emergency Follow Up(Voice Note)"
          : source === "Caregiver Update" ? "Voice Note from Caregiver" : "Voice Note from User",
        subtitle: "Clinical Observation",
        summary: o.summary,
        audio_url: o.source_document_url || null,
        transcript: o.raw_transcript || null,
        icon: MessageSquare,
        color: isEmergency ? "red" : (source === "Caregiver Update" ? "purple" : "green"),
      });
    });

    // Add documents, but skip those already added via observations
    (history.documents || []).forEach((d: any) => {
      // Deduplicate: if an observation already points to this document, skip it
      if (items.some(i => i.source_document_id === d.id)) return;

      const isVoice = d.document_type === "voice_note";
      const source = d.source_label || "App Upload";

      let voiceTitle = "Voice Note from User";
      let voiceColor = "green";
      if (source === "Emergency Voice Note" || source === "app_upload" || source === "crisis_follow_up") {
        voiceTitle = "Emergency Follow Up(Voice Note)";
        voiceColor = "red";
      } else if (source === "Caregiver Update") {
        voiceTitle = "Voice Note from Caregiver";
        voiceColor = "purple";
      }

      items.push({
        id: d.id,
        type: isVoice ? "voice" : "document",
        date: d.created_at,
        title: isVoice
          ? voiceTitle
          : d.document_type.replace(/_/g, " ").toUpperCase(),
        subtitle: isVoice ? "Clinical Observation" : `Source: ${source}`,
        summary: d.summary,
        audio_url: isVoice ? (d.audio_url || null) : null,
        transcript: isVoice ? (d.raw_transcript || null) : null,
        icon: isVoice ? MessageSquare : FileText,
        color: isVoice ? voiceColor : "orange",
      });
    });

    // Add crisis events (system events like 'accessed')
    (history.crisis_events || []).forEach((c: any) => {
      // Deduplicate follow-up text responses if they match the summary of an observation
      // (This happens if crisisApi.followUp was called with the same text)
      if (c.type === "crisis_follow_up_response") {
        if (items.some(i => i.summary === c.body)) return;
      }

      let title = c.title;
      if (c.type === "crisis_follow_up_response") {
        title = "Emergency Follow Up(Text)";
      }

      items.push({
        id: c.id,
        type: "crisis",
        date: c.created_at,
        title: title,
        subtitle: c.type === "crisis_follow_up_response" ? "Follow-up Response" : "Emergency Event",
        summary: c.body,
        icon: Siren,
        color: "red",
      });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [history]);

  useEffect(() => {
    if (activePatient) fetch(activePatient.id);
  }, [activePatient?.id, fetch]);

  useEffect(() => {
    if (targetId && timelineItems.length > 0) {
      const el = itemRefs.current[targetId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Clear param after scroll to avoid repeated scrolling
        router.replace("/history");
      }
    }
  }, [targetId, timelineItems, router]);

  async function handleDownload() {
    if (!activePatient) return;
    setDownloading(true);
    const url = await getPdfUrl(activePatient.id);
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      // Force download with a nice filename
      link.setAttribute("download", `Medical_Journey_${activePatient.name}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setDownloading(false);
  }

  if (!activePatient) {
    return <p className="text-[var(--color-muted)] text-sm">No patient selected.</p>;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <PageHeader 
        title="Medical Journey" 
        subtitle={`A chronological timeline of ${activePatient.name}'s care events.`}
      >
        <Button 
          variant="outline" 
          onClick={handleDownload}
          loading={downloading}
          className="shadow-sm font-bold border-slate-200"
        >
          <Download size={16} className="mr-2" />
          Export Full History
        </Button>
      </PageHeader>

      {loading ? (
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[var(--color-border)] before:via-[var(--color-border)] before:to-transparent">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="relative pl-12 animate-pulse">
              <div className="absolute left-0 w-10 h-10 bg-[var(--color-border)] rounded-full border-4 border-white" />
              <div className="h-24 bg-[var(--color-border)] rounded-2xl w-full" />
            </div>
          ))}
        </div>
      ) : timelineItems.length > 0 ? (
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[var(--color-border)] before:via-[var(--color-border)] before:to-transparent">
          {timelineItems.map((item, idx) => (
            <div 
              key={idx} 
              ref={el => { if (item.id) itemRefs.current[item.id] = el; }}
              className="relative pl-12 group"
            >
              {/* Timeline dot/icon */}
              <div className={`absolute left-0 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${
                item.color === 'blue'   ? 'bg-blue-100 text-blue-600' :
                item.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                item.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                item.color === 'red'    ? 'bg-red-100 text-red-600' :
                                          'bg-green-100 text-green-600'
              }`}>
                <item.icon size={18} />
              </div>

              {/* Date tag */}
              <div className="mb-2">
                <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest bg-[var(--color-surface)] px-2 py-1 rounded-md">
                  {new Date(item.date).toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                  {" · "}
                  {new Date(item.date).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>

              {/* Content card */}
              <TimelineCard item={item} initialExpanded={item.id === targetId} />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-[var(--color-surface)] rounded-full flex items-center justify-center text-[var(--color-muted)]">
            <History size={32} />
          </div>
          <div>
            <p className="text-[var(--color-text)] font-bold">Timeline is empty</p>
            <p className="text-[var(--color-muted)] text-sm max-w-xs mx-auto mt-1">
              Once you start adding observations or uploading documents, they will appear here in chronological order.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
