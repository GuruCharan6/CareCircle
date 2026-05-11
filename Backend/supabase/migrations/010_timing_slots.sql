-- ============================================================
-- Migration 010: Structured timing slots on medications
-- Adds timing_slots text[] — structured picker values.
-- Separate from existing timing (raw extraction text).
-- Allowed values (enforced by frontend picker):
--   morning | afternoon | evening | night |
--   with_meals | before_meals | as_needed
-- ============================================================

ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS timing_slots text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.medications.timing_slots IS
  'Structured timing: [morning, night] etc. Set by user picker during approval or edit. Separate from timing (raw extraction text).';
