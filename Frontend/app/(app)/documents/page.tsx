"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { usePatient } from "@/hooks/usePatient";
import { useDocuments } from "@/hooks/useDocuments";
import { documentsApi } from "@/lib/api/documents";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { DocTable } from "@/components/documents/DocTable";
import { DocumentDetailModal } from "@/components/documents/DocumentDetailModal";
import { useRouter, useSearchParams } from "next/navigation";

export default function DocumentsPage() {
  const router = useRouter();
  const { activePatient } = usePatient();
  const { 
    documents, 
    listLoading: loading, 
    fetchDocuments, 
    remove,
    selectedDocument,
    selectDocument,
    closeDetail,
    updateDocumentData
  } = useDocuments();
  const searchParams = useSearchParams();
  const docId = searchParams.get("id");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (activePatient) fetchDocuments(activePatient.id);
  }, [activePatient, fetchDocuments]);

  useEffect(() => {
    if (docId && documents.length > 0) {
      selectDocument(docId);
      // Clear the query param to avoid re-opening on refresh/navigation
      router.replace("/documents");
    }
  }, [docId, documents, selectDocument, router]);

  if (!activePatient) return null;

  const getMatchableText = (doc: any) => {
    const type = doc.document_type.toLowerCase();
    const source = (doc.ingestion_source || "").toLowerCase();
    const date = new Date(doc.event_date || doc.created_at).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    }).toLowerCase();
    
    let title = type;
    const data = doc.extracted_data as any;
    if (data) {
      if (doc.document_type === "prescription") {
        const docName = data.prescriber_name || data.doctor_name || data.doctor || data.prescriber || data.physician;
        if (docName) {
          const cleanName = docName.toLowerCase().startsWith('dr') ? docName : `Dr. ${docName}`;
          title = `${type} — ${cleanName}`;
        }
      } else if (doc.document_type === "lab_report") {
        const facility = data.lab_name || data.hospital_name || data.facility_name || data.clinic_name || data.hospital || data.lab || data.facility;
        if (facility) title = `${type} — ${facility}`;
      }
    }

    return `${title} ${type} ${source} ${date}`.toLowerCase();
  };

  const filtered = documents.filter(d => {
    if (d.document_type === 'voice_note') return false;
    if (!search) return true;
    return getMatchableText(d).includes(search.toLowerCase());
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Page heading */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">Medical Documents</h1>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">
            Clinical records and pathology reports for {activePatient.name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 pl-10 pr-4 bg-white border border-[var(--color-border)] rounded-xl text-sm font-bold text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action)] w-64 transition-all"
            />
          </div>
          <Button 
            onClick={() => router.push("/upload")} 
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-action)] hover:bg-[var(--color-action)]/90 text-white text-sm font-bold transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add Document
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <DocTable
            documents={filtered}
            searchTerm={search}
            onSelect={(doc) => selectDocument(doc.id)}
            onViewOriginal={async (doc) => {
              try {
                const fullDoc = await documentsApi.get(doc.id);
                if (fullDoc.file_url) {
                  window.open(fullDoc.file_url, "_blank");
                }
              } catch (err) {
                console.error("Failed to view document:", err);
                alert("Could not open document. Please try again.");
              }
            }}
            onDelete={remove}
          />
        )}
      </div>

      {selectedDocument && (
        <DocumentDetailModal
          open={!!selectedDocument}
          onClose={closeDetail}
          document={selectedDocument}
          onSave={updateDocumentData}
        />
      )}
    </div>
  );
}
