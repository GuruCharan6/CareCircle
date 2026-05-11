-- Migration 019: Fix calendar-related notifications to use calendar_reminder type
-- watch_event_card was incorrectly used for CalendarWriterAgent notifications;
-- these should be calendar_reminder so the frontend shows "Add to Calendar" CTA.

UPDATE public.notifications
SET type = 'calendar_reminder'
WHERE type = 'watch_event_card'
  AND title IN ('Follow-up appointment scheduled', 'Lab test scheduled');
