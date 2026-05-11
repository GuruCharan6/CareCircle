-- Migration 017: Notification acknowledge columns
-- Enables explicit user acknowledgement for alert notifications.
-- Badge count only decrements when user taps Handled or Still Ongoing.

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS acknowledged_at  timestamptz  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS acknowledge_action text        DEFAULT NULL;
-- acknowledge_action values: 'handled' | 'ongoing'
-- NULL = not yet acknowledged
