-- Add ON DELETE CASCADE to all patient_id foreign keys that were missing it.
-- Allows deleting a patient and automatically removes all related records.

ALTER TABLE public.source_documents
  DROP CONSTRAINT IF EXISTS source_documents_patient_id_fkey,
  ADD CONSTRAINT source_documents_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.whatsapp_messages
  DROP CONSTRAINT IF EXISTS whatsapp_messages_patient_id_fkey,
  ADD CONSTRAINT whatsapp_messages_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.medications
  DROP CONSTRAINT IF EXISTS medications_patient_id_fkey,
  ADD CONSTRAINT medications_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.drug_interaction_results
  DROP CONSTRAINT IF EXISTS drug_interaction_results_patient_id_fkey,
  ADD CONSTRAINT drug_interaction_results_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.medication_refills
  DROP CONSTRAINT IF EXISTS medication_refills_patient_id_fkey,
  ADD CONSTRAINT medication_refills_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.lab_results
  DROP CONSTRAINT IF EXISTS lab_results_patient_id_fkey,
  ADD CONSTRAINT lab_results_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.observations
  DROP CONSTRAINT IF EXISTS observations_patient_id_fkey,
  ADD CONSTRAINT observations_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.clinical_hypotheses
  DROP CONSTRAINT IF EXISTS clinical_hypotheses_patient_id_fkey,
  ADD CONSTRAINT clinical_hypotheses_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.conflict_records
  DROP CONSTRAINT IF EXISTS conflict_records_patient_id_fkey,
  ADD CONSTRAINT conflict_records_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.patient_state
  DROP CONSTRAINT IF EXISTS patient_state_patient_id_fkey,
  ADD CONSTRAINT patient_state_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_patient_id_fkey,
  ADD CONSTRAINT calendar_events_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.gap_actions
  DROP CONSTRAINT IF EXISTS gap_actions_patient_id_fkey,
  ADD CONSTRAINT gap_actions_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_patient_id_fkey,
  ADD CONSTRAINT notifications_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.crisis_packets
  DROP CONSTRAINT IF EXISTS crisis_packets_patient_id_fkey,
  ADD CONSTRAINT crisis_packets_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.document_chunks
  DROP CONSTRAINT IF EXISTS document_chunks_patient_id_fkey,
  ADD CONSTRAINT document_chunks_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
