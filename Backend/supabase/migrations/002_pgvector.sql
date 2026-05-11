-- ============================================================
-- Migration 002: pgvector Indexes + Semantic Search RPC
-- ivfflat indexes on embedding columns.
-- match_document_chunks RPC for chatbot RAG queries.
-- Run after 001 — tables must exist first.
-- ============================================================

-- ivfflat index on source_documents.embedding
CREATE INDEX idx_source_documents_embedding ON public.source_documents
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ivfflat index on document_chunks.embedding
CREATE INDEX idx_document_chunks_embedding ON public.document_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);


-- ── Semantic Search RPC ───────────────────────────────────────
-- Called by chatbot query router (Route B + C).
-- ALWAYS pass patient_id_filter — no cross-patient vector search ever.

CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding     vector(1536),
  patient_id_filter   uuid,
  match_count         int   DEFAULT 10,
  date_from           date  DEFAULT NULL,
  date_to             date  DEFAULT NULL
)
RETURNS TABLE (
  id                  uuid,
  source_document_id  uuid,
  chunk_text          text,
  chunk_index         int,
  metadata            jsonb,
  similarity          float
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    dc.id,
    dc.source_document_id,
    dc.chunk_text,
    dc.chunk_index,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE
    dc.patient_id = patient_id_filter
    AND (date_from IS NULL OR (dc.metadata->>'event_date')::date >= date_from)
    AND (date_to   IS NULL OR (dc.metadata->>'event_date')::date <= date_to)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
