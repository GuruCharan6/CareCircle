-- ============================================
-- FILE: Extensions
-- DESCRIPTION: PostgreSQL extensions required by CareCircle.
--              Must run first — core schema depends on these types.
-- ============================================

-- UUID generation (gen_random_uuid used in all tables)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgvector — enables vector(768) column type and ivfflat indexes
-- Used for Gemini text-embedding-004 embeddings (768 dimensions)
CREATE EXTENSION IF NOT EXISTS vector;

-- moddatetime — powers the updated_at auto-update triggers
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- ============================================
-- END OF FILE
-- ============================================
