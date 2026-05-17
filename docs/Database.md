# Database Schema

CareCircle uses PostgreSQL (via Supabase) with pgvector extension for semantic search. The schema consists of 21 core tables with Row Level Security (RLS) enabled on all user-facing tables.

---

## Core Tables

### users
Primary authentication and user profile table.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | User ID (from Supabase Auth) |
| email | TEXT UNIQUE | User email |
| name | TEXT | Display name |
| timezone | TEXT | User timezone (default: Asia/Kolkata) |
| preferences | JSONB | User preferences (notification settings, etc.) |
| created_at | TIMESTAMPTZ | Account creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**RLS:** Users can only view/edit their own record.

---

### patients
Represents the elderly parent being cared for.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Patient ID |
| user_id | UUID FK → users | Caregiver (the app user) |
| name | TEXT | Patient name |
| date_of_birth | DATE | Birth date |
| blood_type | TEXT | Blood type (A+, O-, etc.) |
| allergies | TEXT[] | Array of known allergies |
| emergency_contacts | JSONB | Array of contact objects |
| primary_physician | TEXT | Primary doctor name |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Last update |

**RLS:** Users can only view/edit their own patients.

**Indexes:**
- `idx_patients_user_id` on `user_id`

---

### medications
All medications the patient has been prescribed.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Medication record ID |
| patient_id | UUID FK → patients | Patient reference |
| medication_name | TEXT | Generic drug name |
| dose | NUMERIC | Dose amount |
| dose_unit | TEXT | mg, ml, etc. |
| frequency | TEXT | "twice daily", "once weekly", etc. |
| route | TEXT | oral, injection, topical, etc. |
| timing_slots | TEXT[] | ["08:00", "20:00"] |
| status | TEXT | active, superseded, discontinued |
| superseded_by | UUID FK → medications | Newer medication that replaced this |
| discontinued_reason | TEXT | Why medication was stopped |
| prescribed_date | DATE | When first prescribed |
| prescriber_id | UUID FK → prescribers | Prescribing doctor |
| source_document_id | UUID FK → source_documents | Original prescription |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**RLS:** Users can view/edit medications for their own patients.

**Indexes:**
- `idx_medications_patient_id` on `patient_id`
- `idx_medications_status` on `status`
- `idx_medications_superseded_by` on `superseded_by`

**Constraints:**
- `status` CHECK IN ('active', 'superseded', 'discontinued')
- `superseded_by` cannot create cycles (enforced in application logic)

---

### lab_results
Lab test results over time.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Lab result ID |
| patient_id | UUID FK → patients | Patient reference |
| test_name | TEXT | HbA1c, Creatinine, Cholesterol, etc. |
| value | NUMERIC | Test value |
| unit | TEXT | %, mg/dL, mmol/L, etc. |
| reference_range | TEXT | "4.0 - 5.6%" |
| is_abnormal | BOOLEAN | Outside reference range? |
| delta_from_prev | NUMERIC | Change from previous reading |
| prev_reading_id | UUID FK → lab_results | Previous test of same type |
| collected_date | DATE | When sample was collected |
| source_document_id | UUID FK → source_documents | Lab report document |
| created_at | TIMESTAMPTZ | |

**RLS:** Users can view lab results for their own patients.

**Indexes:**
- `idx_lab_results_patient_id` on `patient_id`
- `idx_lab_results_test_name` on `test_name`
- `idx_lab_results_collected_date` on `collected_date`

---

### drug_interaction_results
Pairwise drug interaction checks.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Interaction record ID |
| patient_id | UUID FK → patients | Patient reference |
| drug_a_id | UUID FK → medications | First drug |
| drug_b_id | UUID FK → medications | Second drug |
| drug_a_name | TEXT | Generic name (denormalized) |
| drug_b_name | TEXT | Generic name (denormalized) |
| severity | TEXT | contraindicated, major, moderate, minor |
| urgency | TEXT | alert, watch, inform |
| mechanism | TEXT | How the drugs interact |
| recommendation | TEXT | What to do about it |
| lab_modifier_applied | BOOLEAN | Was severity escalated by lab values? |
| lab_values_at_check | JSONB | Creatinine, glucose, etc. at check time |
| checked_at | TIMESTAMPTZ | When interaction was checked |
| expires_at | TIMESTAMPTZ | Cache expiry (30 days from check) |

**RLS:** Users can view interactions for their own patients.

**Indexes:**
- `idx_drug_interactions_patient_id` on `patient_id`
- `idx_drug_interactions_urgency` on `urgency`
- `idx_drug_interactions_expires_at` on `expires_at`

**Constraints:**
- `severity` CHECK IN ('contraindicated', 'major', 'moderate', 'minor')
- `urgency` CHECK IN ('alert', 'watch', 'inform')

---

### source_documents
Uploaded documents (prescriptions, lab reports, etc.)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Document ID |
| patient_id | UUID FK → patients | Patient reference |
| type | TEXT | prescription, lab_report, doctor_note, voice_note, etc. |
| storage_path | TEXT | Supabase Storage path |
| extraction_status | TEXT | pending, review_required, complete, failed |
| field_confidence | JSONB | Confidence scores per extracted field |
| extracted_data | JSONB | Full extracted data |
| embedding | VECTOR(768) | Gemini text embedding for semantic search |
| uploaded_at | TIMESTAMPTZ | Upload timestamp |
| processed_at | TIMESTAMPTZ | When extraction completed |

**RLS:** Users can view/edit documents for their own patients.

**Indexes:**
- `idx_source_documents_patient_id` on `patient_id`
- `idx_source_documents_type` on `type`
- `idx_source_documents_extraction_status` on `extraction_status`
- `idx_source_documents_embedding` HNSW on `embedding` (vector similarity)

**Constraints:**
- `extraction_status` CHECK IN ('pending', 'review_required', 'complete', 'failed')

---

### document_chunks
Chunked text from documents for semantic search.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Chunk ID |
| source_document_id | UUID FK → source_documents | Parent document |
| patient_id | UUID FK → patients | Patient reference (denormalized) |
| chunk_text | TEXT | Text chunk (max 500 tokens) |
| chunk_index | INTEGER | 0-indexed position in document |
| embedding | VECTOR(768) | Gemini text embedding |
| created_at | TIMESTAMPTZ | |

**RLS:** Users can view chunks for their own patients.

**Indexes:**
- `idx_document_chunks_patient_id` on `patient_id`
- `idx_document_chunks_embedding` HNSW on `embedding`

---

### observations
Caregiver and patient self-reported observations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Observation ID |
| patient_id | UUID FK → patients | Patient reference |
| type | TEXT | symptom, meal, medication, mood, vital |
| observation_data | JSONB | Type-specific structured data |
| source | TEXT | caregiver, patient, family |
| raw_transcript | TEXT | Original voice note transcript (if voice) |
| observed_at | TIMESTAMPTZ | When the observation occurred |
| created_at | TIMESTAMPTZ | When logged in system |

**RLS:** Users can view/create observations for their own patients.

**Indexes:**
- `idx_observations_patient_id` on `patient_id`
- `idx_observations_type` on `type`
- `idx_observations_observed_at` on `observed_at`

---

### clinical_hypotheses
AI-generated clinical hypotheses from the pipeline.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Hypothesis ID |
| patient_id | UUID FK → patients | Patient reference |
| rule_id | TEXT | "rule_1_abnormal_lab", "rule_2_medication_deviation", etc. |
| urgency | TEXT | alert, watch, inform |
| hypothesis_text | TEXT | Human-readable description |
| supporting_evidence | JSONB | Lab values, observations, etc. that support this |
| status | TEXT | active, acknowledged, resolved |
| llm_suggested | BOOLEAN | Was this suggested by LLM (Rule 4)? |
| created_at | TIMESTAMPTZ | When hypothesis was generated |
| resolved_at | TIMESTAMPTZ | When marked resolved |

**RLS:** Users can view hypotheses for their own patients.

**Indexes:**
- `idx_clinical_hypotheses_patient_id` on `patient_id`
- `idx_clinical_hypotheses_urgency` on `urgency`
- `idx_clinical_hypotheses_status` on `status`

**Realtime subscription enabled:** Frontend listens for new alert-level hypotheses.

---

### conflict_records
Detected conflicts between different data sources.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Conflict ID |
| patient_id | UUID FK → patients | Patient reference |
| conflict_type | TEXT | A (temporal), B (observational), C (dimensional), D (factual) |
| source_a_type | TEXT | caregiver, patient, lab, prescription |
| source_a_id | UUID | Reference to source record |
| source_b_type | TEXT | caregiver, patient, lab, prescription |
| source_b_id | UUID | Reference to source record |
| conflict_description | TEXT | Human-readable explanation |
| severity | TEXT | minor, moderate, major |
| status | TEXT | unresolved, acknowledged, resolved |
| created_at | TIMESTAMPTZ | When conflict was detected |

**RLS:** Users can view conflicts for their own patients.

**Indexes:**
- `idx_conflict_records_patient_id` on `patient_id`
- `idx_conflict_records_type` on `conflict_type`
- `idx_conflict_records_status` on `status`

---

### whatsapp_messages
WhatsApp message log (inbound + outbound).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Message ID |
| patient_id | UUID FK → patients | Patient reference |
| phone_number | TEXT | WhatsApp number |
| direction | TEXT | inbound, outbound |
| message_body | TEXT | Message text |
| media_url | TEXT | Attached image/voice note URL |
| twilio_sid | TEXT | Twilio message SID |
| status | TEXT | queued, sent, delivered, read, failed |
| linked_entity_type | TEXT | observation, notification, etc. |
| linked_entity_id | UUID | Reference to related record |
| sent_at | TIMESTAMPTZ | |
| delivered_at | TIMESTAMPTZ | |

**RLS:** Users can view messages for their own patients.

**Indexes:**
- `idx_whatsapp_messages_patient_id` on `patient_id`
- `idx_whatsapp_messages_twilio_sid` on `twilio_sid`

---

### notifications
In-app and push notifications.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Notification ID |
| user_id | UUID FK → users | Recipient user |
| patient_id | UUID FK → patients | Related patient |
| title | TEXT | Notification title |
| body | TEXT | Notification body |
| urgency | TEXT | alert, watch, inform |
| channel | TEXT | in_app, push, whatsapp |
| is_read | BOOLEAN | Read status |
| linked_entity_type | TEXT | drug_interaction, clinical_hypothesis, etc. |
| linked_entity_id | UUID | Reference to related record |
| created_at | TIMESTAMPTZ | |
| read_at | TIMESTAMPTZ | |

**RLS:** Users can view their own notifications.

**Indexes:**
- `idx_notifications_user_id` on `user_id`
- `idx_notifications_urgency` on `urgency`
- `idx_notifications_is_read` on `is_read`

**Realtime subscription enabled:** Frontend listens for new notifications.

---

### crisis_packets
Pre-computed emergency information packets.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Packet ID |
| patient_id | UUID FK → patients | Patient reference |
| packet_data | JSONB | Full crisis card JSON |
| redis_key | TEXT | Redis cache key |
| redis_ttl_seconds | INTEGER | 3600 (1 hour) |
| last_rebuild | TIMESTAMPTZ | When packet was last rebuilt |
| next_rebuild_due | TIMESTAMPTZ | When next rebuild is scheduled |

**RLS:** Users can view crisis packets for their own patients.

**Indexes:**
- `idx_crisis_packets_patient_id` on `patient_id`

---

### calendar_events
Appointments, lab tests, medication refills.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Event ID |
| patient_id | UUID FK → patients | Patient reference |
| title | TEXT | Event title |
| event_date | TIMESTAMPTZ | When event occurs |
| event_type | TEXT | appointment, lab_test, refill, other |
| status | TEXT | suggested, confirmed, completed, cancelled |
| metadata | JSONB | Event-specific data (doctor, location, etc.) |
| source | TEXT | pipeline_suggested, user_created, caregiver_created |
| created_at | TIMESTAMPTZ | |

**RLS:** Users can view/edit events for their own patients.

**Indexes:**
- `idx_calendar_events_patient_id` on `patient_id`
- `idx_calendar_events_event_date` on `event_date`
- `idx_calendar_events_status` on `status`

---

### gap_actions
Missing pre-visit tests or other care gaps.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Gap action ID |
| patient_id | UUID FK → patients | Patient reference |
| calendar_event_id | UUID FK → calendar_events | Related appointment |
| gap_type | TEXT | missing_test, missing_refill, etc. |
| description | TEXT | What's missing |
| required_by | DATE | Deadline for action |
| status | TEXT | pending, scheduled, completed, dismissed |
| created_at | TIMESTAMPTZ | When gap was detected |
| resolved_at | TIMESTAMPTZ | When gap was filled |

**RLS:** Users can view gap actions for their own patients.

**Indexes:**
- `idx_gap_actions_patient_id` on `patient_id`
- `idx_gap_actions_status` on `status`

---

### medication_refills
Medication supply tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Refill ID |
| medication_id | UUID FK → medications | Medication reference |
| patient_id | UUID FK → patients | Patient reference (denormalized) |
| supply_days | INTEGER | Days of supply (30, 60, 90) |
| last_refill_date | DATE | When last refilled |
| next_refill_due | DATE | When next refill needed |
| supply_source | TEXT | pharmacy, caregiver, voice_nlu, default |
| reminder_t10_sent_at | TIMESTAMPTZ | T-10 days reminder sent |
| reminder_t3_sent_at | TIMESTAMPTZ | T-3 days reminder sent |
| reminder_t0_sent_at | TIMESTAMPTZ | T-0 days reminder sent |
| status | TEXT | current, upcoming, due, overdue |

**RLS:** Users can view refills for their own patients.

**Indexes:**
- `idx_medication_refills_patient_id` on `patient_id`
- `idx_medication_refills_next_refill_due` on `next_refill_due`

---

### prescribers
Doctors who prescribe medications.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Prescriber ID |
| patient_id | UUID FK → patients | Patient reference |
| name | TEXT | Doctor name |
| specialty | TEXT | Cardiology, Endocrinology, etc. |
| hospital | TEXT | Affiliated hospital |
| phone | TEXT | Contact number |
| email | TEXT | Email address |
| created_at | TIMESTAMPTZ | |

**RLS:** Users can view/edit prescribers for their own patients.

**Indexes:**
- `idx_prescribers_patient_id` on `patient_id`

---

### caregivers
Part-time caregivers who visit the patient.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Caregiver ID |
| patient_id | UUID FK → patients | Patient reference |
| name | TEXT | Caregiver name |
| phone | TEXT | WhatsApp phone number |
| status | TEXT | invited, active, inactive |
| visit_schedule | JSONB | {"monday": ["09:00", "17:00"], ...} |
| last_visit_logged | TIMESTAMPTZ | Last observation logged |
| created_at | TIMESTAMPTZ | |

**RLS:** Users can view/edit caregivers for their own patients.

**Indexes:**
- `idx_caregivers_patient_id` on `patient_id`
- `idx_caregivers_phone` on `phone`

---

### patient_state
Freshness scores for different health dimensions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | State ID |
| patient_id | UUID FK → patients | Patient reference |
| dimension | TEXT | biochemical, behavioral, subjective, clinical |
| freshness_score | NUMERIC | 0.0 - 1.0 (decays over time) |
| last_updated | TIMESTAMPTZ | When dimension was last updated |
| last_data_source | TEXT | What updated it last |

**RLS:** Users can view state for their own patients.

**Realtime subscription enabled:** Frontend listens for freshness changes.

**Redis cache:** Entire table cached in Redis (5 minute TTL).

---

### drug_generic_lookup
Brand → generic drug name mapping (India-specific).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Lookup ID |
| brand_name | TEXT | Commercial brand name |
| generic_name | TEXT | Generic/chemical name |
| source | TEXT | CIMS, 1mg, manual |
| created_at | TIMESTAMPTZ | |

**No RLS:** Lookup table, accessible to all.

**Indexes:**
- `idx_drug_lookup_brand_name` on `brand_name`

---

## Database Migrations

Migrations are plain SQL files in `Backend/supabase/migrations/`. Currently 29 migration files (consolidated structure recommended — see migration consolidation prompt).

### Key Migrations

| Migration | Description |
|-----------|-------------|
| `001_initial_schema.sql` | Core tables (users, patients, medications, lab_results) |
| `002_pgvector.sql` | Enable pgvector extension |
| `003_rls_policies.sql` | Row Level Security on all tables |
| `004_auth_trigger.sql` | Auto-create user record on Supabase Auth signup |
| `005_drug_lookup_seed.sql` | Seed drug generic lookup table |
| `008_storage_buckets.sql` | Supabase Storage buckets (documents, crisis_pdfs, briefings) |
| `009_body_systems.sql` | Body systems lookup for symptom categorization |
| `016_fix_embedding_dimension.sql` | **CRITICAL:** Change vector dimension 1536 → 768 for Gemini |
| `023_document_chunks.sql` | Enable chunked semantic search |

### Applying Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase login
supabase link --project-ref <your-project-ref>

# Apply all pending migrations
supabase db push

# Create new migration
supabase migration new <description>
```

---

## Row Level Security (RLS)

Every user-facing table has RLS enabled. Policies enforce data isolation:

**Standard pattern:**
```sql
-- Users can only view their own patients
CREATE POLICY "Users can view own patients"
  ON public.patients FOR SELECT
  USING (user_id = auth.uid());

-- Users can only edit their own patients
CREATE POLICY "Users can update own patients"
  ON public.patients FOR UPDATE
  USING (user_id = auth.uid());
```

**Service role bypass:**
Backend uses two connection pools:
1. **User pool:** Sets `app.user_id` session variable → RLS enforces isolation
2. **Service-role pool:** Bypasses RLS for pipeline writes and background jobs

---

## Indexes

All foreign keys have indexes. Additional performance indexes:

- **Vector similarity:** HNSW indexes on `embedding` columns for <10ms semantic search
- **Time-series queries:** Indexes on `collected_date`, `observed_at`, `event_date`
- **Status filters:** Indexes on `status`, `urgency`, `extraction_status`

---

## Supabase Realtime

Three tables have realtime subscriptions enabled:

1. **patient_state** → Frontend updates freshness indicators in real-time
2. **clinical_hypotheses** → New alert-level hypotheses trigger in-app notifications
3. **notifications** → New notifications appear instantly

**Frontend subscription example:**
```typescript
const channel = supabase
  .channel('clinical_hypotheses')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'clinical_hypotheses',
    filter: `patient_id=eq.${patientId}`
  }, payload => {
    // Handle new hypothesis
  })
  .subscribe()
```

---

## Storage Buckets

Three Supabase Storage buckets:

1. **documents** — Uploaded prescriptions, lab reports, voice notes
2. **crisis_pdfs** — Generated crisis card PDFs
3. **doctor_briefings** — Generated pre-visit briefing PDFs

**RLS on buckets:** Users can only access files for their own patients.

---

## Performance Considerations

- **Embedding dimensions:** 768 (Gemini text-embedding-004). Migration 016 fixes old 1536 dimension.
- **Vector index:** HNSW with `m=16, ef_construction=64` for fast similarity search
- **Cascade deletes:** Patient deletion cascades to all related tables (medications, labs, documents, etc.)
- **Redis caching:** Crisis packets, drug interactions (30 day TTL), patient state (5 min TTL)