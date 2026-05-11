-- Allow chatbot as a valid source for calendar events created via AI assistant
ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_source_check;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_source_check
    CHECK (source IN (
      'manual','prescription_ingestion','gap_detection',
      'voice_log','doctor_note_extraction','chatbot'
    ));
