-- Migration 018: Add missing notification types to check constraint
-- Adds: crisis_follow_up, crisis_follow_up_response, calendar_reminder

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'alert',
    'watch_event_card',
    'morning_digest',
    'evening_digest',
    'caregiver_visit_reminder',
    'caregiver_update_request',
    'caregiver_invitation',
    'refill_reminder',
    'gap_reminder',
    'staleness_notice',
    'crisis_access',
    'crisis_follow_up',
    'crisis_follow_up_response',
    'drug_interaction_alert',
    'calendar_reminder'
  ));
