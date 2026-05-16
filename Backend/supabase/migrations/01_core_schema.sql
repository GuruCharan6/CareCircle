-- ============================================
-- FILE: Core Schema
-- DESCRIPTION: All 21 tables in dependency order (no FK → has FK → complex).
--              Incorporates all column additions and constraint fixes from
--              migrations 009–029. This is the single source of truth for
--              table structure.
-- ============================================

-- ============================================
-- SECTION 1: Standalone tables (no patient FK)
-- ============================================

-- ── TABLE: users ─────────────────────────────────────────────────
-- Extends Supabase auth.users. id = auth.users.id (no separate UUID).
CREATE TABLE public.users (
  id                uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number      text        UNIQUE,
  email             text        UNIQUE,
  auth_provider     text        NOT NULL CHECK (auth_provider IN ('phone_otp', 'google')),
  name              text        NOT NULL,
  role              text        NOT NULL DEFAULT 'family_caregiver'
                                  CHECK (role IN ('family_caregiver', 'admin')),
  preferences       jsonb       NOT NULL DEFAULT '{
    "morning_digest_time": "07:00",
    "evening_digest_time": "21:30",
    "timezone": "Asia/Kolkata",
    "notifications_push_enabled": true,
    "whatsapp_connected": false,
    "whatsapp_number": null,
    "onboarding_completed_steps": [],
    "caregiver_sms_fallback": true
  }',
  created_at        timestamptz DEFAULT now(),
  last_login_at     timestamptz
);


-- ── TABLE: drug_generic_lookup ───────────────────────────────────
-- India-specific brand → generic translation. Public read, service_role writes.
-- body_systems classifies each drug by targeted organ/system.
CREATE TABLE public.drug_generic_lookup (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name    text    NOT NULL UNIQUE,
  generic_name  text    NOT NULL,
  drug_class    text,
  manufacturer  text,
  country       text    NOT NULL DEFAULT 'IN',
  data_source   text    NOT NULL CHECK (data_source IN ('CIMS','1mg','manual_entry')),
  body_systems  text[]  NOT NULL DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_drug_generic_lookup_brand        ON public.drug_generic_lookup(brand_name);
CREATE INDEX        idx_drug_generic_lookup_generic      ON public.drug_generic_lookup(generic_name);
CREATE INDEX        idx_drug_generic_lookup_body_systems ON public.drug_generic_lookup USING GIN (body_systems);


-- ============================================
-- SECTION 2: Core patient tables
-- ============================================

-- ── TABLE: patients ──────────────────────────────────────────────
-- emergency_contact_primary/secondary: {name, phone, relationship}
-- primary_physician: {name, phone}
-- nearest_hospital: {name, phone}
CREATE TABLE public.patients (
  id                              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                         uuid    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name                            text    NOT NULL,
  date_of_birth                   date,
  gender                          text    CHECK (gender IN ('male', 'female', 'other')),
  blood_type                      text    CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  known_conditions                text[]  DEFAULT '{}',
  known_allergies                 text[]  DEFAULT '{}',
  primary_city                    text,
  emergency_notes                 text,
  emergency_contact_primary       jsonb   DEFAULT NULL,
  emergency_contact_secondary     jsonb   DEFAULT NULL,
  primary_physician               jsonb   DEFAULT NULL,
  nearest_hospital                jsonb   DEFAULT NULL,
  created_at                      timestamptz DEFAULT now(),
  updated_at                      timestamptz DEFAULT now()
);

CREATE INDEX idx_patients_user_id ON public.patients(user_id);


-- ── TABLE: caregivers ────────────────────────────────────────────
CREATE TABLE public.caregivers (
  id                    uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            uuid  NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  added_by              uuid  NOT NULL REFERENCES public.users(id),
  name                  text  NOT NULL,
  phone_number          text  NOT NULL,
  visit_schedule        text[] DEFAULT '{}',
  visit_start_time      time,
  visit_end_time        time,
  invitation_status     text  NOT NULL DEFAULT 'pending'
                                CHECK (invitation_status IN ('pending','confirmed','declined','inactive')),
  invitation_sent_at    timestamptz,
  confirmed_at          timestamptz,
  removed_at            timestamptz,
  notes                 text,
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_caregivers_patient_id   ON public.caregivers(patient_id);
CREATE INDEX idx_caregivers_phone_number ON public.caregivers(phone_number);


-- ── TABLE: prescribers ───────────────────────────────────────────
-- Tracks doctors per patient. Deactivatable — history preserved.
-- medications.prescriber_id (nullable FK) links med to doctor.
CREATE TABLE public.prescribers (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  specialty     text,
  hospital      text,
  phone         text,
  status        text        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'inactive')),
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_prescribers_patient_id ON public.prescribers(patient_id);
CREATE INDEX idx_prescribers_status     ON public.prescribers(status);


-- ============================================
-- SECTION 3: Document and messaging tables
-- ============================================

-- ── TABLE: source_documents ──────────────────────────────────────
-- file_mime_type allows: image/*, audio/*, pdf, text/plain, octet-stream
-- ingestion_source includes crisis_follow_up for text notes
-- embedding: vector(768) for Gemini text-embedding-004
CREATE TABLE public.source_documents (
  id                    uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            uuid  NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  uploaded_by           uuid  REFERENCES public.users(id),
  caregiver_id          uuid  REFERENCES public.caregivers(id),
  document_type         text  NOT NULL
                                CHECK (document_type IN (
                                  'prescription','lab_report','doctor_note',
                                  'voice_note','handwritten_note','other'
                                )),
  ingestion_source      text  NOT NULL
                                CHECK (ingestion_source IN (
                                  'app_upload','os_share_sheet','whatsapp_caregiver',
                                  'camera','crisis_follow_up'
                                )),
  file_url              text  NOT NULL,
  file_mime_type        text  NOT NULL
                                CHECK (
                                  file_mime_type LIKE 'image/%' OR
                                  file_mime_type LIKE 'audio/%' OR
                                  file_mime_type = 'application/pdf' OR
                                  file_mime_type = 'text/plain' OR
                                  file_mime_type = 'application/octet-stream'
                                ),
  file_size_bytes       int,
  extraction_status     text  NOT NULL DEFAULT 'pending'
                                CHECK (extraction_status IN (
                                  'pending','extracting','review_required',
                                  'approved','rejected','failed'
                                )),
  extracted_text        text,
  extracted_data        jsonb,
  field_confidence      jsonb   DEFAULT '{}',
  user_approved_at      timestamptz,
  rejection_reason      text,
  event_date            date,
  embedding             vector(768),
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_source_documents_patient_id        ON public.source_documents(patient_id);
CREATE INDEX idx_source_documents_document_type     ON public.source_documents(document_type);
CREATE INDEX idx_source_documents_extraction_status ON public.source_documents(extraction_status);


-- ── TABLE: whatsapp_messages ─────────────────────────────────────
-- linked_observation_id and linked_notification_id FKs added after
-- observations and notifications tables are created (see deferred FKs below).
CREATE TABLE public.whatsapp_messages (
  id                          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  direction                   text  NOT NULL CHECK (direction IN ('inbound','outbound')),
  sender_phone                text  NOT NULL,
  recipient_phone             text  NOT NULL,
  patient_id                  uuid  REFERENCES public.patients(id) ON DELETE CASCADE,
  sender_type                 text  CHECK (sender_type IN ('caregiver','system','unknown')),
  message_type                text  NOT NULL
                                      CHECK (message_type IN ('text','image','audio','document','video')),
  content_text                text,
  media_url                   text,
  linked_source_document_id   uuid  REFERENCES public.source_documents(id),
  linked_observation_id       uuid,
  linked_notification_id      uuid,
  twilio_message_sid          text  UNIQUE,
  status                      text  NOT NULL DEFAULT 'received'
                                      CHECK (status IN ('received','processed','failed','sent','delivered','read')),
  error_message               text,
  created_at                  timestamptz DEFAULT now()
);

CREATE INDEX idx_whatsapp_messages_patient_id   ON public.whatsapp_messages(patient_id);
CREATE INDEX idx_whatsapp_messages_sender_phone ON public.whatsapp_messages(sender_phone);


-- ============================================
-- SECTION 4: Clinical data tables
-- ============================================

-- ── TABLE: medications ───────────────────────────────────────────
-- timing: raw extraction text from document
-- timing_slots: structured picker values (morning, night, etc.)
-- prescriber_id: nullable link to prescribers table
CREATE TABLE public.medications (
  id                    uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            uuid  NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  source_document_id    uuid  NOT NULL REFERENCES public.source_documents(id),
  brand_name            text,
  generic_name          text  NOT NULL,
  drug_class            text,
  dose                  text  NOT NULL,
  frequency             text  NOT NULL,
  timing                text,
  timing_slots          text[] NOT NULL DEFAULT '{}',
  prescriber_name       text,
  prescriber_specialty  text,
  prescriber_hospital   text,
  prescriber_id         uuid  REFERENCES public.prescribers(id) ON DELETE SET NULL,
  prescribed_date       date,
  status                text  NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','superseded','discontinued')),
  superseded_by         uuid  REFERENCES public.medications(id),
  valid_from            date  NOT NULL,
  valid_until           date,
  notes                 text,
  created_at            timestamptz DEFAULT now()
);

COMMENT ON COLUMN public.medications.timing_slots IS
  'Structured timing: [morning, night] etc. Set by user picker during approval or edit. Separate from timing (raw extraction text).';

CREATE INDEX idx_medications_patient_status ON public.medications(patient_id, status);
CREATE INDEX idx_medications_generic_name   ON public.medications(generic_name);
CREATE INDEX idx_medications_prescriber_id  ON public.medications(prescriber_id);


-- ── TABLE: drug_interaction_results ──────────────────────────────
CREATE TABLE public.drug_interaction_results (
  id                      uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              uuid  NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication_a_id         uuid  NOT NULL REFERENCES public.medications(id),
  medication_b_id         uuid  NOT NULL REFERENCES public.medications(id),
  drug_a_generic          text  NOT NULL,
  drug_b_generic          text  NOT NULL,
  interaction             text  NOT NULL CHECK (interaction IN ('confirmed','possible','unknown')),
  severity                text  CHECK (severity IN ('high','moderate','low')),
  mechanism               text,
  gemini_confidence       text  CHECK (gemini_confidence IN ('high','medium','low')),
  gemini_note             text,
  gemini_raw_response     jsonb NOT NULL,
  lab_modifier_applied    boolean NOT NULL DEFAULT false,
  final_urgency           text  NOT NULL CHECK (final_urgency IN ('alert','watch','inform')),
  notification_sent       boolean NOT NULL DEFAULT false,
  checked_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_drug_interactions_patient_id ON public.drug_interaction_results(patient_id);
CREATE INDEX idx_drug_interactions_pair_date  ON public.drug_interaction_results(drug_a_generic, drug_b_generic, checked_at);


-- ── TABLE: medication_refills ────────────────────────────────────
CREATE TABLE public.medication_refills (
  id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id           uuid    NOT NULL REFERENCES public.medications(id),
  patient_id              uuid    NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  days_supply             int     NOT NULL,
  prescription_start_date date    NOT NULL,
  refill_due_date         date    NOT NULL,
  supply_source           text    NOT NULL
                                    CHECK (supply_source IN (
                                      'meera_input','caregiver_voice_nlu',
                                      'post_call_log_nlu','monthly_whatsapp_check',
                                      'default_assumption_30d'
                                    )),
  is_default_assumption   boolean NOT NULL DEFAULT false,
  refill_confirmed_at     timestamptz,
  reminder_sent_at        jsonb   NOT NULL DEFAULT '[]',
  notes                   text,
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX idx_medication_refills_med_date ON public.medication_refills(medication_id, prescription_start_date);
CREATE INDEX idx_medication_refills_due_date ON public.medication_refills(refill_due_date);


-- ── TABLE: lab_results ───────────────────────────────────────────
-- value and unit are nullable to support ordered tests without results yet
CREATE TABLE public.lab_results (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            uuid    NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  source_document_id    uuid    NOT NULL REFERENCES public.source_documents(id),
  test_name             text    NOT NULL,
  test_name_display     text    NOT NULL,
  value                 numeric,
  unit                  text,
  reference_range_low   numeric,
  reference_range_high  numeric,
  is_abnormal           boolean,
  specialist_type       text,
  lab_name              text,
  test_date             date    NOT NULL,
  delta_from_prev       numeric,
  rate_of_change        numeric,
  prev_reading_id       uuid    REFERENCES public.lab_results(id),
  prev_reading_date     date,
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_lab_results_patient_test_date ON public.lab_results(patient_id, test_name, test_date);
CREATE INDEX idx_lab_results_patient_id        ON public.lab_results(patient_id);


-- ── TABLE: observations ──────────────────────────────────────────
CREATE TABLE public.observations (
  id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              uuid    NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  source_type             text    NOT NULL CHECK (source_type IN ('caregiver_voice','meera_call_log')),
  caregiver_id            uuid    REFERENCES public.caregivers(id),
  source_document_id      uuid    NOT NULL REFERENCES public.source_documents(id),
  observation_date        date    NOT NULL,
  symptoms_reported       text[]  DEFAULT '{}',
  symptoms_denied         text[]  DEFAULT '{}',
  symptoms_absent         text[]  DEFAULT '{}',
  meals_eaten             jsonb   DEFAULT '{"breakfast": null, "lunch": null, "dinner": null}',
  meal_notes              text,
  medications_taken       boolean,
  medication_timing_notes text,
  mobility_notes          text,
  mood                    text    CHECK (mood IN ('normal','good','low','anxious','irritable','confused')),
  energy_level            text    CHECK (energy_level IN ('normal','low','very_low')),
  meera_mood_read         text,
  concerns_flagged        text[]  DEFAULT '{}',
  raw_transcript          text    NOT NULL,
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX idx_observations_patient_date        ON public.observations(patient_id, observation_date);
CREATE INDEX idx_observations_patient_source_type ON public.observations(patient_id, source_type);

-- Deferred FK: whatsapp_messages → observations
ALTER TABLE public.whatsapp_messages
  ADD CONSTRAINT fk_whatsapp_linked_observation
  FOREIGN KEY (linked_observation_id) REFERENCES public.observations(id);


-- ── TABLE: clinical_hypotheses ────────────────────────────────────
-- rule_4_llm_general added for pipeline's rule4_llm_general.py
CREATE TABLE public.clinical_hypotheses (
  id                    uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            uuid  NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  rule_id               text  NOT NULL
                                CHECK (rule_id IN (
                                  'rule_1_medication_without_food',
                                  'rule_2_drug_interaction',
                                  'rule_3_lab_trend',
                                  'rule_4_new_cardiac_med',
                                  'rule_4_llm_general',
                                  'rule_5_caregiver_patient_discrepancy',
                                  'rule_6_meal_skipping_pattern'
                                )),
  trigger_event_type    text  NOT NULL
                                CHECK (trigger_event_type IN (
                                  'observation','lab_result','medication','calendar_event'
                                )),
  trigger_event_id      uuid  NOT NULL,
  hypothesis_text       text  NOT NULL,
  confidence            text  NOT NULL CHECK (confidence IN ('high','medium','low')),
  urgency               text  NOT NULL CHECK (urgency IN ('alert','watch','inform')),
  supporting_evidence   jsonb NOT NULL DEFAULT '[]',
  status                text  NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','resolved','dismissed')),
  resolved_at           timestamptz,
  dismissed_by          uuid  REFERENCES public.users(id),
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_clinical_hypotheses_patient_status ON public.clinical_hypotheses(patient_id, status);
CREATE INDEX idx_clinical_hypotheses_urgency        ON public.clinical_hypotheses(urgency);


-- ── TABLE: conflict_records ───────────────────────────────────────
CREATE TABLE public.conflict_records (
  id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              uuid    NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  conflict_type           text    NOT NULL
                                    CHECK (conflict_type IN (
                                      'A_temporal','B_observational','C_dimensional','D_factual'
                                    )),
  source_a_type           text    NOT NULL
                                    CHECK (source_a_type IN (
                                      'lab_result','observation','medication','calendar_event'
                                    )),
  source_a_id             uuid    NOT NULL,
  source_a_dimension      text    NOT NULL
                                    CHECK (source_a_dimension IN (
                                      'biochemical','behavioral_observable',
                                      'subjective_experience','clinical_instruction'
                                    )),
  source_b_type           text    NOT NULL
                                    CHECK (source_b_type IN (
                                      'lab_result','observation','medication','calendar_event'
                                    )),
  source_b_id             uuid    NOT NULL,
  source_b_dimension      text    NOT NULL
                                    CHECK (source_b_dimension IN (
                                      'biochemical','behavioral_observable',
                                      'subjective_experience','clinical_instruction'
                                    )),
  conflict_description    text    NOT NULL,
  is_resolvable           boolean NOT NULL,
  meera_suggested_action  text,
  status                  text    NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active','acknowledged','resolved')),
  acknowledged_at         timestamptz,
  resolved_at             timestamptz,
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX idx_conflict_records_patient_status ON public.conflict_records(patient_id, status);
CREATE INDEX idx_conflict_records_type           ON public.conflict_records(conflict_type);


-- ============================================
-- SECTION 5: State and scheduling tables
-- ============================================

-- ── TABLE: patient_state ─────────────────────────────────────────
CREATE TABLE public.patient_state (
  id                          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                  uuid  NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  overall_status              text  NOT NULL DEFAULT 'unknown'
                                      CHECK (overall_status IN ('ok','watch','alert','unknown','cannot_assess')),
  biochemical_confidence      text  NOT NULL DEFAULT 'unknown'
                                      CHECK (biochemical_confidence IN ('high','medium','low','unknown')),
  behavioral_confidence       text  NOT NULL DEFAULT 'unknown'
                                      CHECK (behavioral_confidence IN ('high','medium','low','unknown')),
  subjective_confidence       text  NOT NULL DEFAULT 'unknown'
                                      CHECK (subjective_confidence IN ('high','medium','low','unknown')),
  clinical_confidence         text  NOT NULL DEFAULT 'unknown'
                                      CHECK (clinical_confidence IN ('high','medium','low','unknown')),
  last_lab_date               date,
  last_caregiver_note_date    date,
  last_meera_log_date         date,
  last_prescription_date      date,
  active_medication_count     int   NOT NULL DEFAULT 0,
  active_alerts_count         int   NOT NULL DEFAULT 0,
  active_watch_count          int   NOT NULL DEFAULT 0,
  active_conflicts_count      int   NOT NULL DEFAULT 0,
  staleness_status            text  NOT NULL DEFAULT 'unknown'
                                      CHECK (staleness_status IN ('fresh','aging','stale','critical','unknown')),
  last_digest_summary         text,
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_patient_state_patient_id ON public.patient_state(patient_id);


-- ── TABLE: calendar_events ───────────────────────────────────────
-- caregiver_id: when set, only that caregiver notified (not all confirmed caregivers)
-- source includes chatbot (AI assistant) and caregiver_schedule (visit sync)
CREATE TABLE public.calendar_events (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            uuid    NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  caregiver_id          uuid    REFERENCES public.caregivers(id) ON DELETE SET NULL,
  event_type            text    NOT NULL CHECK (event_type IN ('appointment','caregiver_visit','lab_test')),
  title                 text    NOT NULL,
  specialist_type       text,
  event_date            date    NOT NULL,
  event_time            time,
  location              text,
  status                text    NOT NULL DEFAULT 'suggested'
                                  CHECK (status IN ('suggested','confirmed','completed','cancelled')),
  source                text    NOT NULL
                                  CHECK (source IN (
                                    'manual','prescription_ingestion','gap_detection',
                                    'voice_log','doctor_note_extraction','chatbot','caregiver_schedule'
                                  )),
  required_tests        text[]  DEFAULT '{}',
  tests_status          jsonb   DEFAULT '{}',
  reminder_sent_at      text[]  NOT NULL DEFAULT '{}',
  is_recurring          boolean NOT NULL DEFAULT false,
  recurrence_pattern    text,
  parent_event_id       uuid    REFERENCES public.calendar_events(id),
  confirmed_by          uuid    REFERENCES public.users(id),
  notes                 text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_calendar_events_patient_date_status ON public.calendar_events(patient_id, event_date, status);
CREATE INDEX idx_calendar_events_event_type          ON public.calendar_events(event_type);
CREATE INDEX idx_calendar_events_caregiver_id        ON public.calendar_events(caregiver_id) WHERE caregiver_id IS NOT NULL;


-- ── TABLE: gap_actions ───────────────────────────────────────────
CREATE TABLE public.gap_actions (
  id                      uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              uuid  NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  action_type             text  NOT NULL
                                  CHECK (action_type IN (
                                    'schedule_test','refill_medication',
                                    'book_appointment','coordinate_caregiver'
                                  )),
  test_name               text,
  medication_id           uuid  REFERENCES public.medications(id),
  for_appointment_id      uuid  REFERENCES public.calendar_events(id),
  due_by                  date  NOT NULL,
  responsible_party       text  NOT NULL CHECK (responsible_party IN ('meera','caregiver','patient')),
  urgency                 text  NOT NULL CHECK (urgency IN ('alert','watch','inform')),
  status                  text  NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','in_progress','completed','overdue')),
  escalation_level        int   NOT NULL DEFAULT 0 CHECK (escalation_level BETWEEN 0 AND 5),
  last_escalation_at      timestamptz,
  completed_at            timestamptz,
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX idx_gap_actions_patient_status     ON public.gap_actions(patient_id, status);
CREATE INDEX idx_gap_actions_due_by             ON public.gap_actions(due_by);
CREATE INDEX idx_gap_actions_for_appointment_id ON public.gap_actions(for_appointment_id);


-- ============================================
-- SECTION 6: Notification and crisis tables
-- ============================================

-- ── TABLE: notifications ─────────────────────────────────────────
-- acknowledge_action values: 'handled' | 'ongoing' | NULL (not yet acknowledged)
-- type includes crisis_follow_up, crisis_follow_up_response, calendar_reminder
CREATE TABLE public.notifications (
  id                      uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              uuid  NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  recipient_user_id       uuid  REFERENCES public.users(id),
  recipient_caregiver_id  uuid  REFERENCES public.caregivers(id),
  type                    text  NOT NULL
                                  CHECK (type IN (
                                    'alert','watch_event_card',
                                    'morning_digest','evening_digest',
                                    'caregiver_visit_reminder','caregiver_update_request',
                                    'caregiver_invitation','refill_reminder','gap_reminder',
                                    'staleness_notice','crisis_access',
                                    'crisis_follow_up','crisis_follow_up_response',
                                    'drug_interaction_alert','calendar_reminder'
                                  )),
  channel                 text  NOT NULL CHECK (channel IN ('push','whatsapp','in_app','system_event')),
  direction               text  NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound','system_event')),
  title                   text  NOT NULL,
  body                    text  NOT NULL,
  action_deep_link        text,
  linked_entity_type      text  CHECK (linked_entity_type IN (
                                  'medication','lab_result','calendar_event',
                                  'conflict_record','clinical_hypothesis','gap_action'
                                )),
  linked_entity_id        uuid,
  digest_period           text  CHECK (digest_period IN ('morning','evening')),
  digest_content          jsonb,
  sent_at                 timestamptz,
  delivered_at            timestamptz,
  read_at                 timestamptz,
  acknowledged_at         timestamptz  DEFAULT NULL,
  acknowledge_action      text         DEFAULT NULL,
  status                  text  NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','sent','delivered','read','failed')),
  error_message           text,
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_patient_type_sent ON public.notifications(patient_id, type, sent_at);
CREATE INDEX idx_notifications_recipient_user_id ON public.notifications(recipient_user_id);
CREATE INDEX idx_notifications_status            ON public.notifications(status);

-- Deferred FK: whatsapp_messages → notifications
ALTER TABLE public.whatsapp_messages
  ADD CONSTRAINT fk_whatsapp_linked_notification
  FOREIGN KEY (linked_notification_id) REFERENCES public.notifications(id);


-- ── TABLE: crisis_packets ────────────────────────────────────────
-- One row per patient (UNIQUE). Rebuilt nightly or on trigger events.
-- lab_results: snapshot of recent lab values for emergency responders
-- patient_name/patient_dob: denormalized for quick emergency card display
CREATE TABLE public.crisis_packets (
  id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              uuid    NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  generated_at            timestamptz NOT NULL,
  rebuild_triggered_by    text    NOT NULL
                                    CHECK (rebuild_triggered_by IN (
                                      'scheduled_nightly','medication_change',
                                      'contact_update','manual','pdf_export'
                                    )),
  medications             jsonb   NOT NULL DEFAULT '[]',
  last_cardiac_event      jsonb,
  emergency_contacts      jsonb   NOT NULL DEFAULT '[]',
  nearest_emergency       jsonb,
  known_allergies         text[]  DEFAULT '{}',
  blood_type              text,
  active_alerts           text[]  DEFAULT '{}',
  lab_results             jsonb   NOT NULL DEFAULT '[]',
  known_conditions        text[]  NOT NULL DEFAULT '{}',
  patient_name            text,
  patient_dob             text,
  is_current              boolean NOT NULL DEFAULT true,
  updated_at              timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_crisis_packets_patient_id         ON public.crisis_packets(patient_id);
CREATE INDEX        idx_crisis_packets_patient_is_current ON public.crisis_packets(patient_id, is_current);


-- ============================================
-- SECTION 7: Vector search / RAG table
-- ============================================

-- ── TABLE: document_chunks ───────────────────────────────────────
-- embedding: vector(768) for Gemini text-embedding-004
-- fts_tokens: maintained by chunks_fts_trigger for keyword search fallback
CREATE TABLE public.document_chunks (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id    uuid    NOT NULL REFERENCES public.source_documents(id) ON DELETE CASCADE,
  patient_id            uuid    NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  chunk_text            text    NOT NULL,
  chunk_index           int     NOT NULL,
  token_count           int,
  embedding             vector(768) NOT NULL,
  fts_tokens            tsvector,
  metadata              jsonb   NOT NULL DEFAULT '{}',
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_document_chunks_patient_id         ON public.document_chunks(patient_id);
CREATE INDEX idx_document_chunks_source_document_id ON public.document_chunks(source_document_id);
CREATE INDEX idx_chunks_fts                         ON public.document_chunks USING GIN(fts_tokens);

-- ============================================
-- END OF FILE
-- ============================================
