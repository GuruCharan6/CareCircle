import { FileText, FileAudio, FileImage, ExternalLink, Trash2, MoreVertical, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { DocStatusBadge } from "./DocStatusBadge";
import type { DocumentListItem, DocumentType } from "@/lib/types";

const TYPE_ICON: Record<DocumentType, typeof FileText> = {
  prescription: FileText,
  lab_report: FileText,
  voice_note: FileAudio,
  doctor_note: FileText,
  handwritten_note: FileImage,
  other: FileText,
};

const TYPE_LABEL: Record<DocumentType, string> = {
  prescription: "Prescription",
  lab_report: "Lab report",
  voice_note: "Voice note",
  doctor_note: "Doctor note",
  handwritten_note: "Note",
  other: "Other",
};

const SOURCE_LABEL: Record<string, string> = {
  app_upload: "App Upload",
  os_share_sheet: "Share Sheet",
  camera: "Camera",
};

interface DocTableProps {
  documents: DocumentListItem[];
  searchTerm?: string;
  onSelect?: (doc: DocumentListItem) => void;
  onDelete?: (docId: string) => void;
  onViewOriginal?: (doc: DocumentListItem) => void;
}

function Highlight({ text, query }: { text: string; query?: string }) {
  if (!query || !query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <span key={i} className="bg-yellow-200 text-[#0D3B6E] rounded-sm px-0.5">{part}</span>
          : part
      )}
    </>
  );
}

function getDocTitle(doc: DocumentListItem): string {
  const type = TYPE_LABEL[doc.document_type];
  const data = doc.extracted_data as any;
  if (data) {
    if (doc.document_type === "prescription") {
      let docName = data.prescriber_name || data.doctor_name || data.doctor || data.prescriber || data.physician;
      if (!docName && Array.isArray(data.medications) && data.medications.length > 0) {
        docName = data.medications[0].prescriber_name;
      }
      if (docName) {
        const cleanName = docName.toLowerCase().startsWith("dr") ? docName : `Dr. ${docName}`;
        return `${type} — ${cleanName}`;
      }
    } else if (doc.document_type === "lab_report") {
      const facility = data.lab_name || data.hospital_name || data.facility_name || data.clinic_name || data.hospital || data.lab || data.facility;
      if (facility) return `${type} — ${facility}`;
    }
  }
  return type;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocTable({ documents, searchTerm, onSelect, onDelete, onViewOriginal }: DocTableProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!documents.length) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="w-16 h-16 bg-[var(--color-surface)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--color-muted)]">
          <FileText size={28} />
        </div>
        <p className="text-[var(--color-muted)] font-medium">
          {searchTerm ? `No documents matching "${searchTerm}"` : "No documents found."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[400px]">
      {/* ── Mobile card list ─────────────────────────────── */}
      <div className="lg:hidden bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-[0_1px_3px_rgba(0,0,0,0.08)] divide-y divide-[var(--color-border)] overflow-hidden">
        {documents.map(doc => {
          const Icon = TYPE_ICON[doc.document_type];
          const title = getDocTitle(doc);
          const date = new Date(doc.event_date || doc.created_at || Date.now()).toLocaleDateString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
          });
          const size = formatSize(doc.file_size_bytes);
          const isMenuOpen = activeMenu === doc.id;

          return (
            <div
              key={doc.id}
              className="flex items-start gap-3 px-4 py-3.5 hover:bg-[var(--color-bg)]/50 active:bg-[var(--color-bg)] transition-colors cursor-pointer"
              onClick={() => onSelect?.(doc)}
            >
              {/* File icon */}
              <div className="w-9 h-9 rounded-lg bg-[var(--color-bg)] flex items-center justify-center shrink-0 border border-[var(--color-border)]/50 mt-0.5">
                <Icon size={16} className="text-[var(--color-action)]" />
              </div>

              {/* Content — name + meta row, name gets full width */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--color-text)] leading-snug">
                  <Highlight text={title} query={searchTerm} />
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[11px] text-[var(--color-muted)]">{date}</span>
                  {size && <span className="text-[11px] text-[var(--color-muted)] opacity-70">{size}</span>}
                  <DocStatusBadge status={doc.extraction_status} />
                </div>
              </div>

              {/* 3-dots — relative container so dropdown anchors here */}
              <div
                className="relative shrink-0"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setActiveMenu(isMenuOpen ? null : doc.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-all active:scale-90"
                >
                  <MoreVertical size={16} />
                </button>
                {isMenuOpen && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-[var(--color-border)] py-1 z-50"
                  >
                    <button
                      onClick={() => { setActiveMenu(null); onSelect?.(doc); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface)] text-left"
                    >
                      <ChevronRight size={13} /> View Details
                    </button>
                    <button
                      onClick={() => { setActiveMenu(null); onViewOriginal?.(doc); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface)] text-left"
                    >
                      <ExternalLink size={13} /> View Original
                    </button>
                    <div className="my-1 border-t border-[var(--color-border)]/50" />
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        if (confirm("Delete this document?")) onDelete?.(doc.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-[var(--color-alert)] hover:bg-red-50 text-left"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table ─────────────────────────────────── */}
      <div className="hidden lg:block bg-white rounded-2xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
            <tr>
              <th className="py-4 px-6 text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest w-[40%]">Document</th>
              <th className="py-4 px-4 text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Type</th>
              <th className="py-4 px-4 text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Source</th>
              <th className="py-4 px-4 text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Date</th>
              <th className="py-4 px-4 text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Extraction</th>
              <th className="py-4 px-6 text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {documents.map(doc => {
              const Icon = TYPE_ICON[doc.document_type];
              const isMenuOpen = activeMenu === doc.id;

              return (
                <tr
                  key={doc.id}
                  className="group hover:bg-[var(--color-bg)]/50 transition-colors cursor-pointer"
                  onClick={() => onSelect?.(doc)}
                >
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-bg)] flex items-center justify-center shrink-0 border border-[var(--color-border)]/50">
                        <Icon size={18} className="text-[var(--color-action)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--color-text)] truncate">
                          <Highlight text={getDocTitle(doc)} query={searchTerm} />
                        </p>
                        <p className="text-[11px] text-[var(--color-muted)] font-bold mt-0.5 opacity-70">
                          doc_{doc.id.split("-")[0]} · {formatSize(doc.file_size_bytes)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <span className="px-2 py-0.5 rounded-lg bg-[var(--color-action)]/10 text-[var(--color-action)] text-[10px] font-black uppercase tracking-wide border border-[var(--color-action)]/20">
                      <Highlight text={doc.document_type} query={searchTerm} />
                    </span>
                  </td>
                  <td className="py-5 px-4">
                    <span className="text-[13px] text-[var(--color-muted)] font-bold opacity-80">
                      <Highlight text={SOURCE_LABEL[doc.ingestion_source] || doc.ingestion_source} query={searchTerm} />
                    </span>
                  </td>
                  <td className="py-5 px-4">
                    <span className="text-[13px] text-[var(--color-muted)] font-bold opacity-80 whitespace-nowrap">
                      <Highlight
                        text={new Date(doc.event_date || doc.created_at || Date.now()).toLocaleDateString("en-GB", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                        query={searchTerm}
                      />
                    </span>
                  </td>
                  <td className="py-5 px-4">
                    <DocStatusBadge status={doc.extraction_status} />
                  </td>
                  <td className="py-5 px-6 text-right relative">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); onSelect?.(doc); }}
                        className="px-4 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] text-xs font-bold hover:bg-[var(--color-bg)] transition-all shadow-sm active:scale-95"
                      >
                        View
                      </button>
                      <div className="relative">
                        <button
                          onClick={e => { e.stopPropagation(); setActiveMenu(isMenuOpen ? null : doc.id); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-all active:scale-90"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {isMenuOpen && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-[var(--color-border)] py-1.5 z-50 animate-in fade-in zoom-in duration-100 origin-top-right"
                          >
                            <button
                              onClick={e => { e.stopPropagation(); setActiveMenu(null); onViewOriginal?.(doc); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors text-left"
                            >
                              <ExternalLink size={14} /> View Original Document
                            </button>
                            <div className="my-1 border-t border-[var(--color-border)]/50" />
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setActiveMenu(null);
                                if (confirm("Are you sure you want to delete this document?")) {
                                  onDelete?.(doc.id);
                                }
                              }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[var(--color-alert)] hover:bg-red-50 transition-colors text-left"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
