-- ============================================================
-- Migration 007: moddatetime Extension + updated_at Triggers
-- Auto-updates updated_at column on every UPDATE.
-- Applied to all tables that have an updated_at column.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS moddatetime;

-- Shared trigger function (fallback if moddatetime extension unavailable)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- patients
CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- drug_generic_lookup
CREATE TRIGGER drug_generic_lookup_updated_at
  BEFORE UPDATE ON public.drug_generic_lookup
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- patient_state
CREATE TRIGGER patient_state_updated_at
  BEFORE UPDATE ON public.patient_state
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- calendar_events
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- crisis_packets
CREATE TRIGGER crisis_packets_updated_at
  BEFORE UPDATE ON public.crisis_packets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
