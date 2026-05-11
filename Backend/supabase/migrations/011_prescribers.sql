-- ============================================================
-- Migration 011: Prescribers table
-- Tracks doctors per patient. Deactivatable — history preserved.
-- medications.prescriber_id (nullable FK) links med to doctor.
-- ============================================================

-- ── TABLE: prescribers ────────────────────────────────────────
CREATE TABLE public.prescribers (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  specialty     text,                           -- 'Cardiology' | 'Endocrinology' etc.
  hospital      text,
  phone         text,
  status        text        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'inactive')),
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_prescribers_patient_id ON public.prescribers(patient_id);
CREATE INDEX idx_prescribers_status     ON public.prescribers(status);

-- RLS
ALTER TABLE public.prescribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prescribers_select" ON public.prescribers
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));

CREATE POLICY "prescribers_insert" ON public.prescribers
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));

CREATE POLICY "prescribers_update" ON public.prescribers
  FOR UPDATE USING (patient_id IN (SELECT public.get_user_patient_ids()));

-- updated_at trigger
CREATE TRIGGER prescribers_updated_at
  BEFORE UPDATE ON public.prescribers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Link medications → prescribers ───────────────────────────
-- Nullable: old medications without a linked prescriber still work.
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS prescriber_id uuid REFERENCES public.prescribers(id) ON DELETE SET NULL;

CREATE INDEX idx_medications_prescriber_id ON public.medications(prescriber_id);
