-- Migration 016: Fix embedding dimension — 1536 → 768
-- Gemini text-embedding-004 returns 768-dim vectors.
-- Original schema specified 1536 (OpenAI). Gemini was chosen instead, so all
-- embedding inserts fail with dimension mismatch. This migration corrects all
-- vector columns and the match_document_chunks RPC to use 768.
--
-- Safe to run on empty vector columns (no valid 1536-dim data would exist).
-- ============================================================

-- Step 1: Drop ivfflat indexes (cannot change column type with active index)
DROP INDEX IF EXISTS public.idx_source_documents_embedding;
DROP INDEX IF EXISTS public.idx_document_chunks_embedding;

-- Step 2: Drop the RPC — its input parameter type must also change
DROP FUNCTION IF EXISTS public.match_document_chunks(vector, uuid, int, date, date);

-- Step 3: Alter source_documents.embedding from vector(1536) → vector(768)
-- Null out existing data (any 1536-dim vectors stored are invalid anyway)
ALTER TABLE public.source_documents
    ALTER COLUMN embedding TYPE vector(768) USING NULL::vector(768);

-- Step 4: Alter document_chunks.embedding from vector(1536) → vector(768)
ALTER TABLE public.document_chunks
    ALTER COLUMN embedding TYPE vector(768) USING NULL::vector(768);

-- Step 5: Recreate ivfflat indexes on corrected columns
CREATE INDEX idx_source_documents_embedding ON public.source_documents
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_document_chunks_embedding ON public.document_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Step 6: Recreate match_document_chunks RPC with vector(768) parameter
-- Called by chatbot query router (Route B + C).
-- ALWAYS pass patient_id_filter — no cross-patient vector search ever.
CREATE OR REPLACE FUNCTION public.match_document_chunks(
    query_embedding     vector(768),
    patient_id_filter   uuid,
    match_count         int     DEFAULT 10,
    date_from           date    DEFAULT NULL,
    date_to             date    DEFAULT NULL
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
        AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
$$;
