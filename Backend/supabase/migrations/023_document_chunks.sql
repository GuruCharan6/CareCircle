-- 1. Add the search vector column
ALTER TABLE public.document_chunks 
ADD COLUMN IF NOT EXISTS fts_tokens tsvector;

-- 2. Create an index for fast keyword lookups
CREATE INDEX IF NOT EXISTS idx_chunks_fts ON public.document_chunks USING GIN(fts_tokens);

-- 3. Update existing rows with current text
UPDATE public.document_chunks 
SET fts_tokens = to_tsvector('english', chunk_text)
WHERE fts_tokens IS NULL;

-- 4. Create a trigger to keep the search index updated automatically on every upload
CREATE OR REPLACE FUNCTION chunks_fts_trigger() RETURNS trigger AS $$
BEGIN
  new.fts_tokens := to_tsvector('english', COALESCE(new.chunk_text, ''));
  RETURN new;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chunks_fts_update ON public.document_chunks;
CREATE TRIGGER trg_chunks_fts_update
BEFORE INSERT OR UPDATE ON public.document_chunks
FOR EACH ROW EXECUTE FUNCTION chunks_fts_trigger();
