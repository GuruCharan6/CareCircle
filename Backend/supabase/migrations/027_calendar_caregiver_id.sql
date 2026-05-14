-- Add caregiver_id to calendar_events for one-off caregiver visit scheduling.
-- Nullable: existing events and non-caregiver-visit events leave this NULL.
-- When set, caregiver_visit_messages job notifies only that specific caregiver
-- instead of all confirmed caregivers for the patient.

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS caregiver_id UUID REFERENCES public.caregivers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_caregiver_id
  ON public.calendar_events(caregiver_id)
  WHERE caregiver_id IS NOT NULL;
