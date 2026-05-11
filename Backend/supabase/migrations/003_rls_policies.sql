-- ============================================================
-- Migration 003: Row Level Security Policies
-- RLS helper function + enable RLS + policies on all 19 tables.
-- All patient-scoped tables use get_user_patient_ids() helper.
-- service_role key bypasses RLS — backend writes use service_role pool.
-- ============================================================

-- ── RLS Helper ────────────────────────────────────────────────
-- Returns all patient_ids owned by current auth user.
-- SECURITY DEFINER so it can query patients table past RLS.

CREATE OR REPLACE FUNCTION public.get_user_patient_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM public.patients WHERE user_id = auth.uid()
$$;


-- ── Table 1: users ────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON public.users FOR SELECT  USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT  WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE  USING (auth.uid() = id);


-- ── Table 2: patients ─────────────────────────────────────────
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_select" ON public.patients FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "patients_insert" ON public.patients FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "patients_update" ON public.patients FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "patients_delete" ON public.patients FOR DELETE USING (user_id = auth.uid());


-- ── Table 3: caregivers ───────────────────────────────────────
ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "caregivers_select" ON public.caregivers
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "caregivers_insert" ON public.caregivers
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "caregivers_update" ON public.caregivers
  FOR UPDATE USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "caregivers_delete" ON public.caregivers
  FOR DELETE USING (patient_id IN (SELECT public.get_user_patient_ids()));


-- ── Table 4: source_documents ─────────────────────────────────
ALTER TABLE public.source_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "source_documents_select" ON public.source_documents
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "source_documents_insert" ON public.source_documents
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "source_documents_update" ON public.source_documents
  FOR UPDATE USING (patient_id IN (SELECT public.get_user_patient_ids()));


-- ── Table 5: whatsapp_messages ────────────────────────────────
-- Writes via service_role only (webhook handler). Meera reads only.
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_messages_select" ON public.whatsapp_messages
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));


-- ── Table 6: medications ──────────────────────────────────────
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medications_select" ON public.medications
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "medications_insert" ON public.medications
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "medications_update" ON public.medications
  FOR UPDATE USING (patient_id IN (SELECT public.get_user_patient_ids()));


-- ── Table 7: drug_interaction_results ────────────────────────
ALTER TABLE public.drug_interaction_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drug_interactions_select" ON public.drug_interaction_results
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "drug_interactions_insert" ON public.drug_interaction_results
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));


-- ── Table 8: drug_generic_lookup ─────────────────────────────
-- Public read for all authenticated users. Only service_role writes.
ALTER TABLE public.drug_generic_lookup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drug_generic_lookup_read_authenticated" ON public.drug_generic_lookup
  FOR SELECT USING (auth.role() = 'authenticated');


-- ── Table 9: medication_refills ───────────────────────────────
ALTER TABLE public.medication_refills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medication_refills_select" ON public.medication_refills
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "medication_refills_insert" ON public.medication_refills
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "medication_refills_update" ON public.medication_refills
  FOR UPDATE USING (patient_id IN (SELECT public.get_user_patient_ids()));


-- ── Table 10: lab_results ─────────────────────────────────────
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab_results_select" ON public.lab_results
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "lab_results_insert" ON public.lab_results
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));


-- ── Table 11: observations ────────────────────────────────────
ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "observations_select" ON public.observations
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "observations_insert" ON public.observations
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));


-- ── Table 12: clinical_hypotheses ─────────────────────────────
ALTER TABLE public.clinical_hypotheses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_hypotheses_select" ON public.clinical_hypotheses
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "clinical_hypotheses_insert" ON public.clinical_hypotheses
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "clinical_hypotheses_update" ON public.clinical_hypotheses
  FOR UPDATE USING (patient_id IN (SELECT public.get_user_patient_ids()));


-- ── Table 13: conflict_records ────────────────────────────────
ALTER TABLE public.conflict_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conflict_records_select" ON public.conflict_records
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "conflict_records_insert" ON public.conflict_records
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "conflict_records_update" ON public.conflict_records
  FOR UPDATE USING (patient_id IN (SELECT public.get_user_patient_ids()));


-- ── Table 14: patient_state ───────────────────────────────────
ALTER TABLE public.patient_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient_state_select" ON public.patient_state
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "patient_state_insert" ON public.patient_state
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "patient_state_update" ON public.patient_state
  FOR UPDATE USING (patient_id IN (SELECT public.get_user_patient_ids()));


-- ── Table 15: calendar_events ─────────────────────────────────
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calendar_events_select" ON public.calendar_events
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "calendar_events_insert" ON public.calendar_events
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "calendar_events_update" ON public.calendar_events
  FOR UPDATE USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "calendar_events_delete" ON public.calendar_events
  FOR DELETE USING (patient_id IN (SELECT public.get_user_patient_ids()));


-- ── Table 16: gap_actions ─────────────────────────────────────
ALTER TABLE public.gap_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gap_actions_select" ON public.gap_actions
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "gap_actions_insert" ON public.gap_actions
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "gap_actions_update" ON public.gap_actions
  FOR UPDATE USING (patient_id IN (SELECT public.get_user_patient_ids()));


-- ── Table 17: notifications ───────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (patient_id IN (SELECT public.get_user_patient_ids()));


-- ── Table 18: crisis_packets ──────────────────────────────────
ALTER TABLE public.crisis_packets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crisis_packets_select" ON public.crisis_packets
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "crisis_packets_insert" ON public.crisis_packets
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "crisis_packets_update" ON public.crisis_packets
  FOR UPDATE USING (patient_id IN (SELECT public.get_user_patient_ids()));


-- ── Table 19: document_chunks ─────────────────────────────────
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_chunks_select" ON public.document_chunks
  FOR SELECT USING (patient_id IN (SELECT public.get_user_patient_ids()));
CREATE POLICY "document_chunks_insert" ON public.document_chunks
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.get_user_patient_ids()));
