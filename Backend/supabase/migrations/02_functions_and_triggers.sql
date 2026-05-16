-- ============================================
-- FILE: Functions & Triggers
-- DESCRIPTION: All database functions, triggers, vector search indexes,
--              and realtime publication config.
--              Run after core_schema — tables must exist.
-- ============================================

-- ============================================
-- SECTION 1: RLS Helper Function
-- ============================================

-- Returns all patient_ids owned by the current auth user.
-- SECURITY DEFINER so it can query patients table past RLS.
-- Used by every patient-scoped RLS policy.
CREATE OR REPLACE FUNCTION public.get_user_patient_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM public.patients WHERE user_id = auth.uid()
$$;


-- ============================================
-- SECTION 2: Auth Trigger
-- ============================================

-- Auto-creates public.users row when Supabase Auth user signs up.
-- Fires on INSERT into auth.users (phone OTP or Google OAuth).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, auth_provider, name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'
      ELSE 'phone_otp'
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ============================================
-- SECTION 3: Updated-at Triggers
-- ============================================

-- Shared trigger function (fallback if moddatetime extension unavailable).
-- Applied to all tables with an updated_at column.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER drug_generic_lookup_updated_at
  BEFORE UPDATE ON public.drug_generic_lookup
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER patient_state_updated_at
  BEFORE UPDATE ON public.patient_state
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER crisis_packets_updated_at
  BEFORE UPDATE ON public.crisis_packets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER prescribers_updated_at
  BEFORE UPDATE ON public.prescribers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================
-- SECTION 4: Full-Text Search Trigger
-- ============================================

-- Keeps document_chunks.fts_tokens in sync on every insert/update.
CREATE OR REPLACE FUNCTION public.chunks_fts_trigger()
RETURNS trigger AS $$
BEGIN
  new.fts_tokens := to_tsvector('english', COALESCE(new.chunk_text, ''));
  RETURN new;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chunks_fts_update ON public.document_chunks;
CREATE TRIGGER trg_chunks_fts_update
  BEFORE INSERT OR UPDATE ON public.document_chunks
  FOR EACH ROW EXECUTE FUNCTION public.chunks_fts_trigger();


-- ============================================
-- SECTION 5: Vector Search (pgvector)
-- ============================================

-- ivfflat indexes for cosine similarity — Gemini text-embedding-004 (768-dim)
-- ALWAYS pass patient_id_filter to match_document_chunks — no cross-patient search.
CREATE INDEX idx_source_documents_embedding ON public.source_documents
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_document_chunks_embedding ON public.document_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Semantic search RPC called by chatbot query router (Route B + C).
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding     vector(768),
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
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;


-- ============================================
-- SECTION 6: Realtime Publication
-- ============================================

-- Flutter/Next.js clients subscribe via Supabase Realtime SDK.
-- RLS still enforced — users only see their own patient data.
-- patient_state   → dashboard status card + staleness bar (live)
-- notifications   → unread badge count (live)
-- clinical_hypotheses → active watch/alert indicators (live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clinical_hypotheses;

-- ============================================
-- END OF FILE
-- ============================================
