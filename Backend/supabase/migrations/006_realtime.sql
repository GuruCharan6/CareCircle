-- ============================================================
-- Migration 006: Supabase Realtime
-- Enables realtime broadcast for 3 tables:
--   patient_state        → dashboard STATUS card + staleness bar (live)
--   notifications        → unread badge count (live)
--   clinical_hypotheses  → active watch/alert indicators (live)
--
-- Flutter/Next.js clients subscribe via Supabase Realtime SDK.
-- RLS still enforced — users only see their own patient data.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clinical_hypotheses;
