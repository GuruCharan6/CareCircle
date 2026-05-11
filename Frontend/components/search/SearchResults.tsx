"use client";

import { FileText, Activity, Pill, Calendar, Search as SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { SearchResultItem } from "@/lib/types";

interface Props {
  results: SearchResultItem[];
  query: string;
  total: number;
}

const TYPE_ICON = {
  document: FileText,
  observation: Activity,
  medication: Pill,
  calendar_event: Calendar,
} as const;

function Highlight({ text, query }: { text: string; query?: string }) {
  if (!query || !query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <span key={i} className="bg-yellow-100 text-[#0D3B6E] font-semibold rounded-sm px-0.5">{part}</span>
          : part
      )}
    </>
  );
}

export function SearchResults({ results, query, total }: Props) {
  const router = useRouter();
  if (!query) return null;

  if (!results.length) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-[var(--color-border)] shadow-sm">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
          <SearchIcon size={28} />
        </div>
        <p className="text-[var(--color-muted)] font-medium">
          No results found for "{query}"
        </p>
        <p className="text-xs text-[var(--color-muted)] mt-1 opacity-70">
          Try adjusting your keywords or filters.
        </p>
      </div>
    );
  }

  const handleView = (type: string, id: string) => {
    switch (type) {
      case "document":
        router.push(`/documents?id=${id}`);
        break;
      case "observation":
        router.push(`/history?id=${id}`);
        break;
      case "medication":
        router.push(`/medications?id=${id}`);
        break;
      case "calendar_event":
        router.push(`/calendar?id=${id}`);
        break;
      default:
        break;
    }
  };

  const getButtonLabel = (type: string) => {
    switch (type) {
      case "document": return "View Document";
      case "observation": return "View Observation";
      case "medication": return "View Medication";
      case "calendar_event": return "View Appointment";
      default: return "View Details";
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-[var(--color-muted)] font-medium px-1">
        Showing {results.length} results for <span className="text-[var(--color-primary)] font-bold">"{query}"</span>
      </p>

      <div className="space-y-4">
        {results.map(r => {
          const docId = r.entity_id.split("-")[0];
          const formattedDate = r.event_date
            ? new Date(r.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : "";

          return (
            <div
              key={`${r.entity_type}-${r.entity_id}`}
              className="relative bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-sm hover:shadow-md transition-all group"
            >
              {/* Score Badge */}
              <div className="absolute top-6 right-6">
                <span className="bg-emerald-50 text-emerald-600 text-[11px] font-bold px-2 py-0.5 rounded border border-emerald-100">
                  {r.score.toFixed(2)}
                </span>
              </div>

              <div className="space-y-3">
                {/* Title and Subtitle */}
                <h3 className="text-[16px] font-bold text-[var(--color-primary)] pr-16 leading-tight">
                  <Highlight text={r.title} query={query} />
                  {r.subtitle && (
                    <>
                      <span className="mx-2 text-slate-300 font-light">—</span>
                      <span className="text-[var(--color-muted)]">
                        <Highlight text={r.subtitle} query={query} />
                      </span>
                    </>
                  )}
                </h3>

                {/* Metadata Row */}
                <div className="flex items-center gap-2 text-[12px] text-slate-400 font-medium font-mono">
                  <span className="text-[var(--color-action)] lowercase tracking-tight">{r.entity_type.replace("_", " ")}</span>
                  <span>·</span>
                  <span>{formattedDate}</span>
                  <span>·</span>
                  <span className="opacity-70">id_{docId}</span>
                </div>

                {/* Excerpt */}
                {r.excerpt && (
                  <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-3 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50 italic">
                    ...<Highlight text={r.excerpt} query={query} />...
                  </p>
                )}

                {/* Action Button */}
                <div className="pt-2">
                  <button 
                    onClick={() => handleView(r.entity_type, r.entity_id)}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-[12px] font-bold rounded-lg shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 active:scale-95"
                  >
                    {getButtonLabel(r.entity_type)}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
