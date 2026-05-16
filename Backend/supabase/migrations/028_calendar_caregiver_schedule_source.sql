-- Allow caregiver_schedule as a valid source for calendar events
-- generated when a caregiver's visit schedule is saved.
ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_source_check;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_source_check
    CHECK (source IN (
      'manual','prescription_ingestion','gap_detection',
      'voice_log','doctor_note_extraction','chatbot',
      'caregiver_schedule'
    ));
