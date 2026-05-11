-- Migration 022: Add missing ingestion sources and rebuild triggers
-- Adds: crisis_follow_up to source_documents.ingestion_source
-- Adds: pdf_export to crisis_packets.rebuild_triggered_by

-- 1. Update source_documents.ingestion_source check constraint
ALTER TABLE public.source_documents
  DROP CONSTRAINT IF EXISTS source_documents_ingestion_source_check;

ALTER TABLE public.source_documents
  ADD CONSTRAINT source_documents_ingestion_source_check CHECK (ingestion_source IN (
    'app_upload', 'os_share_sheet', 'whatsapp_caregiver', 'camera', 'crisis_follow_up'
  ));

-- 2. Update crisis_packets.rebuild_triggered_by check constraint
ALTER TABLE public.crisis_packets
  DROP CONSTRAINT IF EXISTS crisis_packets_rebuild_triggered_by_check;

ALTER TABLE public.crisis_packets
  ADD CONSTRAINT crisis_packets_rebuild_triggered_by_check CHECK (rebuild_triggered_by IN (
    'scheduled_nightly', 'medication_change', 'contact_update', 'manual', 'pdf_export'
  ));
