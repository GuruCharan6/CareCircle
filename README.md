# 🩺 CareCircle

**AI-powered care coordination platform for remotely managing elderly parents' health across multiple hospitals, doctors, and caregivers — unified in one place.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat&logo=next.js)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=flat&logo=postgresql)](https://supabase.com)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=flat&logo=redis)](https://redis.io)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=flat&logo=google)](https://ai.google.dev)

---

## 📋 Table of Contents

- [The Problem](#-the-problem)
- [Solution Overview](#-solution-overview)
- [Key Features](#-key-features)
- [Technical Architecture](#-technical-architecture)
- [The Five-Layer AI Pipeline](#-the-five-layer-ai-pipeline)
- [Tech Stack](#-tech-stack)
- [Database Schema](#-database-schema)
- [API Documentation](#-api-documentation)
- [Background Jobs](#-background-jobs)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Design Principles](#-design-principles)
- [Development Workflow](#-development-workflow)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Acknowledgments](#-acknowledgments)

---

## 🚨 The Problem

Millions of working professionals in India manage their elderly parents' health from a distance — across multiple hospitals, different doctors who don't talk to each other, and part-time caregivers who report inconsistently. The result is a fragmented, dangerous mess:

- **Dr. A prescribes Metformin. Dr. B prescribes Glibenclamide.** Nobody checks if these interact. The patient silently takes both.
- **The caregiver says Dad is "fine." Dad says he's "better." The lab report says HbA1c is 9.2%.** These three sources contradict each other — and nobody reconciles them.
- **There's a cardiologist appointment next Tuesday.** Nobody noticed the pre-appointment ECG was never ordered.
- **It's 2 AM. Dad collapsed.** The ER nurse asks for his medication list. Nobody can find the paper.
- **The caregiver changed medication timing from 8 AM to 9 PM** — a 13-hour shift that no one noticed.

Existing solutions fail because they are either: (1) static record repositories with no intelligence, (2) single-hospital portals that can't see across providers, or (3) generic reminder apps that don't understand medical context.

CareCircle solves all five scenarios above with AI that works across every provider, document, and caregiver your family uses.

---

## 💡 Solution Overview

CareCircle is a GenAI-powered care coordination platform for eldercare. It ingests health documents (prescriptions, lab reports, voice notes from caregivers), runs them through a five-layer AI reasoning pipeline, and surfaces actionable intelligence to the family caregiver — before problems escalate.

**Who it's for:** Adult children (25–45 years) remotely managing a parent's chronic illness across multiple providers in India.

**Core capabilities:**
- OCR + structured extraction from prescription photos and lab reports (Google Gemini vision)
- Parallel drug interaction detection across every active medication (Gemini + lab-value modifiers)
- Multi-source health reconciliation — flags when caregiver reports, patient self-reports, and lab data conflict
- Proactive care gap detection — catches missing pre-visit tests before appointments
- Pre-computed emergency card (loads in <1s, no DB queries during a crisis)
- AI chatbot with tool use — query patient data in plain language, schedule events, log updates

---

## ✨ Key Features

### 1. Document Ingestion & AI Extraction

**What it does:** User photographs a prescription or uploads a lab report. The system uses Google Gemini vision to extract structured data — medication names, doses, frequencies, lab values, reference ranges, follow-up dates.

**How it works:**
1. Frontend requests a signed Supabase Storage upload URL (`POST /api/v1/documents/{doc_id}/upload-url`)
2. Client uploads the file **directly to storage** — no file bytes pass through the API
3. User triggers extraction (`POST /api/v1/documents/{doc_id}/process`) → Celery task fires
4. Layer 1 ingestion runs the appropriate parser based on document type (see `Backend/app/pipeline/layer1_ingest/prescription.py`, `lab_report.py`, `voice_note.py`)
5. Extracted data appears in the Approval Modal — user reviews field-by-field and approves or edits
6. On approval (`POST /api/v1/documents/{doc_id}/approve`), the five-layer pipeline runs in full

**Files:** `Backend/app/services/document_service.py`, `Backend/app/pipeline/layer1_ingest/`

---

### 2. Drug Interaction Detection

**What it does:** Every time a new medication is added, all active medications are checked pairwise for drug interactions. Interactions are classified by severity (contraindicated/major/moderate/minor) and urgency (alert/watch/inform). Alert-level interactions trigger in-app notifications immediately.

**How it works:**
1. New medication saved → `on_medication_added` event fires (`Backend/app/worker/events.py`)
2. `DrugInteractionManager.run()` loads all active medications, groups by generic name
3. For each unique pair: checks Redis cache → checks DB (within 30 days) → calls Gemini if uncached
4. All uncached Gemini calls run **in parallel** via `asyncio.gather()`
5. Lab-value modifiers escalate urgency: elevated creatinine (>1.5 mg/dL) + renal-cleared drug → +1 urgency level; rising glucose trend + glycemic drug → +1 urgency level
6. Results stored in `drug_interaction_results` table; alert-level results emit in-app notifications

**Files:** `Backend/app/agents/drug_interaction_manager.py`, `Backend/app/agents/drug_pair_worker.py`, `Backend/app/cache/drug_interaction_cache.py`

---

### 3. Five-Layer AI Reasoning Pipeline

See [The Five-Layer AI Pipeline](#-the-five-layer-ai-pipeline) section below.

**Files:** `Backend/app/pipeline/orchestrator.py`, `Backend/app/agents/ingestion_orchestrator.py`

---

### 4. Proactive Care Gap Detection

**What it does:** When a prescription or doctor note with a follow-up appointment is ingested, the system checks whether required pre-visit tests (e.g., HbA1c before endocrinology, INR before cardiology) have been ordered. Missing tests create `gap_actions` with escalating reminders.

**How it works:**
1. `IngestionOrchestrator` detects follow-up date or ordered tests in extracted document data
2. `CalendarWriterAgent` creates a suggested `calendar_event` for the appointment
3. `GapDetectionAgent` compares appointment type against required pre-visit tests; creates `gap_actions` for any missing tests
4. Daily job at 6:00 AM IST (`daily_gap_detection.py`) rescans all upcoming appointments

**Files:** `Backend/app/agents/gap_detection_agent.py`, `Backend/app/agents/calendar_writer_agent.py`, `Backend/app/worker/jobs/daily_gap_detection.py`

---

### 5. Emergency Crisis Card

**What it does:** One tap launches a full-screen emergency card with: all active medications + doses, emergency contacts (family + caregivers + primary physician), nearest hospital, known allergies, blood type, active clinical alerts, recent abnormal labs. Also generates a printable PDF. Loads in under 1 second — even without internet for cached data.

**How it works:**
1. Nightly job at 2:00 AM IST (`nightly_crisis_rebuild.py`) pre-computes crisis packets for all patients
2. Packet stored in both `crisis_packets` table and Redis (1-hour TTL)
3. On `GET /api/v1/patients/{id}/crisis` — Redis hit → instant response, no DB queries
4. `POST /api/v1/patients/{id}/crisis/pdf` → generates PDF via ReportLab, uploads to Supabase Storage, returns signed URL

**Files:** `Backend/app/services/crisis_service.py`, `Backend/app/agents/crisis_mode_agent.py`, `Backend/app/lib/pdf_generator.py`, `Backend/app/worker/jobs/nightly_crisis_rebuild.py`

---

### 6. Multi-Source Health Reconciliation

**What it does:** Detects when different sources contradict each other and classifies the conflict type:
- **Type A (Temporal):** Same value changed over time (e.g., medication timing shifted)
- **Type B (Observational):** Caregiver says one thing, patient says another
- **Type C (Dimensional):** Biochemical data contradicts subjective report
- **Type D (Factual):** Hard factual conflict (e.g., two prescriptions with different doses of same drug)

**How it works:** Layer 4 (Reconcile) of the pipeline runs deterministic conflict classifiers against the normalized document + recent observations. Conflicts are written to `conflict_records` table and surface in the dashboard.

**Files:** `Backend/app/pipeline/layer4_reconcile/` (type_a_temporal.py, type_b_observational.py, type_c_dimensional.py, type_d_factual.py, classifier.py)

---

### 7. AI Chatbot (Agentic, Tool-Use)

**What it does:** Natural language interface for querying patient data, scheduling events, and logging updates. Understands medical context ("What tests does Dad need before his cardiology appointment next Tuesday?").

**How it works:**
1. Simple action intents (upload/log) bypass LLM entirely via keyword matching — instant response
2. Complex queries enter a multi-turn agentic loop (max 3 iterations) with Gemini
3. Gemini selects tools: `get_medications`, `get_lab_results`, `get_appointments`, `search_notes`
4. `search_notes` performs hybrid search: Gemini text-embedding-004 → vector similarity + full-text → reranker
5. Scheduling intents → `propose_action` tool → user confirms → calendar event created
6. Context-aware suggested prompts generated from patient state (upcoming appointments, caregiver silence)

**Files:** `Backend/app/services/chatbot_service.py`, `Backend/app/lib/reranker.py`, `Backend/app/repositories/document_chunk_repository.py`

---

### 8. WhatsApp Caregiver Integration

**What it does:** Caregivers receive WhatsApp invitations, pre-visit reminders, and can send voice notes or text updates directly via WhatsApp. Inbound messages are transcribed (Sarvam AI for Hindi/regional languages) and processed as observations.

**How it works:**
1. `POST /api/v1/patients/{id}/caregivers` → Twilio sends WhatsApp invitation with onboarding link
2. Daily job (`caregiver_visit_messages.py`) sends pre-visit WhatsApp reminders at 8:00 AM IST
3. Inbound messages hit `POST /api/v1/webhooks/whatsapp` (Twilio webhook)
4. `WhatsAppService.process_inbound_message()` classifies message type, transcribes audio (Sarvam), creates observation

**Files:** `Backend/app/services/whatsapp_service.py`, `Backend/app/api/routes/webhooks.py`, `Backend/app/worker/jobs/caregiver_visit_messages.py`

---

### 9. Morning & Evening Digests

**What it does:** Daily digest at 7:00 AM (morning) and 9:30 PM (evening) via push notification + WhatsApp. Morning: active alerts, upcoming appointments, due refills, gap actions. Evening: caregiver observation summary, new hypotheses, medication adherence.

**Files:** `Backend/app/services/digest_service.py`, `Backend/app/worker/jobs/morning_digest.py`, `Backend/app/worker/jobs/evening_digest.py`

---

### 10. Patient State Freshness Scoring

**What it does:** Computes a real-time "data freshness" score across four dimensions (biochemical, behavioral, subjective, clinical). Shows the family caregiver exactly how stale the patient's health picture is — and which dimension needs updating.

**Files:** `Backend/app/services/patient_state_service.py`, `Backend/app/worker/jobs/staleness_check.py`

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │Dashboard │  │Documents │  │ Chatbot  │  │  Crisis Card (SOS) │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬───────────┘  │
└───────┼─────────────┼─────────────┼──────────────────┼─────────────┘
        │  Bearer JWT │             │                  │
        ▼             ▼             ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       FASTAPI BACKEND                                │
│  AuthExtractionMiddleware → RateLimitMiddleware → LoggingMiddleware  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    API Router /api/v1                         │   │
│  │  auth/ · patients/ · documents/ · medications/ · calendar/   │   │
│  │  drug-interactions/ · crisis/ · chatbot/ · webhooks/         │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                              │                                       │
│  ┌───────────────────────────▼──────────────────────────────────┐   │
│  │                      Services Layer                           │   │
│  │  DocumentService · DrugInteractionService · CrisisService     │   │
│  │  ChatbotService · DigestService · PatientStateService         │   │
│  └──────────────┬─────────────────────────────┬─────────────────┘   │
│                 │                             │                      │
│  ┌──────────────▼──────────┐   ┌─────────────▼──────────────────┐  │
│  │   Ingestion Orchestrator│   │   Agents (Specialized AI)       │  │
│  │   (post-approval flow)  │   │   DrugInteractionManager        │  │
│  │   Pipeline Layers 1–5   │   │   GapDetectionAgent             │  │
│  │   CalendarWriterAgent   │   │   CrisisModeAgent               │  │
│  │   SurfaceAgent          │   │   SurfaceAgent                  │  │
│  └──────────────┬──────────┘   └─────────────┬──────────────────┘  │
└─────────────────┼───────────────────────────────────────────────────┘
                  │
         ┌────────┴────────────────────────────────┐
         │                                         │
┌────────▼──────────┐                    ┌─────────▼──────────┐
│   PostgreSQL       │                    │     Redis           │
│   (Supabase)       │                    │                     │
│                    │                    │  Crisis packets     │
│  29 migrations     │                    │  Drug interaction   │
│  RLS policies      │                    │  cache (30 days)    │
│  pgvector (768d)   │                    │  Patient state      │
│  Realtime on       │                    │  (5 min TTL)        │
│  notifications +   │                    │  Rate limiting      │
│  patient_state     │                    │  Celery broker      │
└────────────────────┘                    └────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    CELERY WORKER (Background Jobs)                   │
│                                                                      │
│  Pipeline Processor · Nightly Crisis Rebuild · Morning/Evening       │
│  Digest · Daily Gap Detection · Drug Interaction Scan                │
│  Refill Escalation · Staleness Check · Caregiver Silence Detector   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL SERVICES                              │
│                                                                      │
│  Google Gemini ──── Vision OCR + Text embeddings + LLM reasoning    │
│  Anthropic Claude ─ LLM provider (via app/providers/llm/base.py)    │
│  Sarvam AI ──────── Hindi/regional language voice transcription      │
│  Twilio ─────────── WhatsApp messaging + SMS OTP                    │
│  Firebase FCM ───── Push notifications (iOS + Android + web)        │
│  Supabase Storage ─ Document files + generated PDFs (private)       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 The Five-Layer AI Pipeline

Every approved document runs through a sequential five-layer pipeline. Layers 1–4 are deterministic (rule-based, no LLM calls). Layer 5 uses an LLM to translate structured findings into human-readable summaries.

**Entry point:** `Backend/app/pipeline/orchestrator.py` → `PipelineOrchestrator.run()`
**Coordinator:** `Backend/app/agents/ingestion_orchestrator.py` → `IngestionOrchestrator.run()`

---

### Layer 1: Ingest

**What happens:** Extracts structured data from a raw document. Selects the appropriate parser based on `document_type`. Uses Google Gemini vision for image documents (prescriptions, lab reports, handwritten notes). Produces an `IngestedItem` object.

**Parsers:**

| Document Type | File | AI Used |
|---|---|---|
| `prescription` | `layer1_ingest/prescription.py` | Gemini vision (extract medications, doses, follow-up date, ordered tests) |
| `lab_report` | `layer1_ingest/lab_report.py` | Gemini vision (extract test names, values, units, reference ranges) |
| `voice_note` | `layer1_ingest/voice_note.py` | Sarvam AI transcription → rule-based extraction |
| `doctor_note` | `layer1_ingest/doctor_note.py` | Gemini vision |
| `handwritten_note` | `layer1_ingest/handwritten.py` | Gemini vision |
| `other` | `layer1_ingest/other.py` | Gemini vision |

**Output:** `IngestedItem` — source type, source document ID, patient ID, event time, extracted data dict

---

### Layer 2: Normalize

**What happens:** Tags the `IngestedItem` with a **dimension** (which health axis it measures) and a **source profile** (expected characteristics of this source type — reliability, subjectivity, typical fields). Produces a `NormalizedItem`.

**Files:** `layer2_normalize/dimension_tagger.py`, `layer2_normalize/source_profiles.py`, `layer2_normalize/types.py`

**Dimensions assigned:** biochemical · behavioral · subjective · clinical

**Output:** `NormalizedItem` — IngestedItem + dimension + source profile

---

### Layer 3: Enrich

**What happens:** Runs 4 rules against the normalized item + patient context. Each rule that fires produces one or more `ClinicalHypothesis` objects (stored in `clinical_hypotheses` table).

**Rules:**

| Rule | File | What it detects |
|---|---|---|
| Rule 1: Drug Interaction | `rules/rule1_drug_interaction.py` | New medication interacts with existing active medication |
| Rule 2: Lab Trend | `rules/rule2_lab_trend.py` | Lab value is abnormal or worsening vs. prior readings |
| Rule 3: Caregiver Discrepancy | `rules/rule3_caregiver_discrepancy.py` | Caregiver report conflicts with recent patient-reported or biochemical data |
| Rule 4: LLM General | `rules/rule4_llm_general.py` | Open-ended reasoning — catches patterns rules 1–3 miss (async, LLM call) |

**Patient context fetched:** active medications · lab results (last 90 days) · observations (last 14 days) · known drug interactions

**Output:** List of `ClinicalHypothesis` objects (hypothesis text, confidence, urgency: alert/watch/inform, supporting evidence)

---

### Layer 4: Reconcile

**What happens:** Compares the normalized item against recent observations to detect contradictions. Classifies conflicts by type and writes them to `conflict_records`.

**Conflict classifiers:**

| Type | File | Detection logic |
|---|---|---|
| Type A — Temporal | `type_a_temporal.py` | Same dimension changed between two timestamps (e.g., medication timing shifted 13 hours) |
| Type B — Observational | `type_b_observational.py` | Two observers (caregiver vs. patient) report different values for same dimension |
| Type C — Dimensional | `type_c_dimensional.py` | Biochemical dimension contradicts behavioral/subjective dimension |
| Type D — Factual | `type_d_factual.py` | Hard factual conflict (e.g., duplicate prescriptions with different doses) |

**Output:** List of `ClassifiedConflict` objects (conflict type, source A, source B, description, suggested action)

---

### Layer 5: Reason

**What happens:** Takes the list of hypotheses and conflicts from layers 3–4 and uses an LLM to format them into a structured **Three-Part Output**: (1) known facts, (2) conflicts to surface, (3) a plain-language summary for the caregiver.

**Key design principle:** The LLM *translates* structured findings — it does **not** generate new hypotheses. All medical reasoning is deterministic (layers 1–4); the LLM only writes human-readable text.

**Files:** `layer5_reason/__init__.py`, `layer5_reason/three_part_formatter.py`, `layer5_reason/system_prompt.py`, `layer5_reason/types.py`

**Output:** `ThreePartOutput` — known_facts[], conflicts_to_surface[], plain_summary, max_urgency (alert/watch/inform)

---

### Post-Pipeline: Ingestion Orchestrator

After Layer 5, `IngestionOrchestrator` runs additional agents:

```
document_approved
  → Pipeline (Layers 1–5)              [always]
  → CalendarWriterAgent                [if prescription/doctor_note with follow-up]
      → creates suggested calendar_event
  → GapDetectionAgent                  [if calendar event = appointment type]
      → creates gap_actions for missing pre-visit tests
  → SurfaceAgent                       [if urgency = alert or watch]
      → routes to push/WhatsApp/in-app notification
```

Drug interaction checks are **not** part of this flow — they fire via `on_medication_added` event to avoid double-firing.

---

## 🛠️ Tech Stack

### Backend

| Category | Technology | Version | Purpose |
|---|---|---|---|
| Framework | FastAPI | 0.136.1 | Async HTTP API |
| ASGI Server | Uvicorn + standard | 0.46.0 | Production server |
| Database driver | asyncpg | 0.31.0 | Async PostgreSQL (two-pool: service role + user RLS) |
| Database platform | Supabase | 2.29.0 | PostgreSQL + Storage + Auth + Realtime |
| ORM/Validation | Pydantic | 2.13.3 | Request/response schemas, settings |
| Cache | Redis (hiredis) | 6.4.0 | Crisis packet cache, drug interaction cache, rate limiting |
| Task queue | Celery + Redis | 5.6.3 | Background job scheduling |
| AI — Gemini | google-genai | ≥1.75.0 | Vision OCR, text embeddings (768d), LLM reasoning, tool use |
| AI — Claude | anthropic | 0.97.0 | Alternative LLM provider |
| Voice transcription | Sarvam AI | (HTTP) | Hindi/regional language transcription |
| WhatsApp/SMS | twilio | 9.10.5 | Caregiver WhatsApp, OTP SMS |
| Push notifications | firebase-admin | 7.4.0 | FCM push to iOS/Android/web |
| PDF generation | reportlab + pillow | 4.4.10 | Emergency card PDFs, doctor briefing PDFs |
| JWT | python-jose / PyJWT | 3.5.0 / 2.10.1 | Supabase JWT verification |
| Auth | Supabase Auth | — | Phone OTP + Google OAuth |
| HTTP client | httpx | 0.28.1 | Async external API calls |
| Logging | structlog | 25.5.0 | Structured JSON logging with request context |
| Metrics | prometheus-client | 0.25.0 | Prometheus metrics endpoint |
| Retry | tenacity | 9.1.4 | LLM API retry logic |
| Token counting | tiktoken | 0.12.0 | LLM prompt token counting |
| Linting | ruff | 0.15.12 | Python linting + formatting |
| Type checking | mypy | 1.20.2 | Static type checking |
| Testing | pytest + pytest-asyncio | 9.0.3 | Async test suite |

### Frontend

| Category | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 16.2.4 | React with App Router, SSR |
| Language | TypeScript | 5 | Type-safe React |
| UI Base | React | 19.2.4 | Component library |
| Styling | Tailwind CSS | 4 | Utility-first CSS |
| UI Components | Radix UI (Dialog, Dropdown, Toggle) | — | Accessible headless components |
| Icons | lucide-react | 1.14.0 | Icon set |
| Auth | @react-oauth/google | 0.13.5 | Google OAuth flow |
| State management | React Context (PatientProvider) | — | Active patient context |
| Push notifications | Firebase SDK | 12.13.0 | FCM token registration |
| Cookie storage | js-cookie | 3.0.5 | Auth token persistence |
| Utility | clsx + tailwind-merge | — | Conditional class composition |
| Linting | ESLint + eslint-config-next | 9 | Code quality |

### Infrastructure

| Component | Technology | Notes |
|---|---|---|
| Database | PostgreSQL (Supabase) | 29 migrations, pgvector extension (768d embeddings), RLS on all tables |
| File storage | Supabase Storage | 3 private buckets: documents, crisis PDFs, medication PDFs |
| Realtime | Supabase Realtime | Enabled on `patient_state`, `notifications`, `clinical_hypotheses` |
| Background jobs | Celery Beat | IST timezone, 11 scheduled jobs |
| Metrics | Prometheus | MetricsMiddleware + `/metrics` endpoint |
| Deployment (Frontend) | Vercel | `https://care-circle-three.vercel.app` |

---

## 🗄️ Database Schema

29 migrations in `Backend/supabase/migrations/`. Core tables:

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | References `auth.users(id)` — auto-created on Supabase signup |
| `phone_number` | TEXT UNIQUE | Nullable (Google OAuth users may not have phone) |
| `email` | TEXT UNIQUE | Nullable |
| `auth_provider` | TEXT | `phone_otp` or `google` |
| `name` | TEXT NOT NULL | |
| `role` | TEXT | Default: `family_caregiver` |
| `preferences` | JSONB | Digest times, timezone, notification settings |
| `created_at` | TIMESTAMPTZ | |
| `last_login_at` | TIMESTAMPTZ | |

### `patients`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | CASCADE delete |
| `name` | TEXT NOT NULL | |
| `date_of_birth` | DATE | |
| `gender` | TEXT | `male`/`female`/`other` |
| `blood_type` | TEXT | |
| `known_conditions` | TEXT[] | |
| `known_allergies` | TEXT[] | |
| `primary_city` | TEXT | |
| `emergency_notes` | TEXT | |
| `emergency_contact_primary` | JSONB | `{name, phone, relationship}` |
| `emergency_contact_secondary` | JSONB | |
| `primary_physician` | JSONB | `{name, phone, hospital}` |
| `nearest_hospital` | JSONB | `{name, phone}` |

One user → many patients (multi-patient architecture).

### `source_documents`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `patient_id` | UUID FK → patients | |
| `uploaded_by` | UUID FK → users | |
| `document_type` | TEXT | `prescription`/`lab_report`/`voice_note`/`doctor_note`/`handwritten_note`/`other` |
| `ingestion_source` | TEXT | `app_upload`/`os_share_sheet`/`whatsapp_caregiver`/`camera` |
| `file_url` | TEXT | Supabase Storage path |
| `extraction_status` | TEXT | `pending`/`extracting`/`review_required`/`approved`/`rejected`/`failed` |
| `extracted_data` | JSONB | AI-extracted structured data |
| `field_confidence` | JSONB | Per-field confidence scores |
| `embedding` | vector(768) | Gemini text-embedding-004 for semantic search |

### `medications`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `patient_id` | UUID FK → patients | |
| `source_document_id` | UUID FK → source_documents | Which prescription it came from |
| `brand_name` | TEXT | |
| `generic_name` | TEXT | |
| `drug_class` | TEXT | |
| `dose` | TEXT | e.g., "500mg" |
| `frequency` | TEXT | e.g., "twice daily" |
| `timing` | TEXT | e.g., "after meals" |
| `timing_slots` | JSONB[] | Structured timing slots |
| `prescriber_id` | UUID FK → prescribers | |
| `status` | TEXT | `active`/`superseded`/`discontinued` |
| `superseded_by` | UUID (self-ref) | Points to replacement medication |
| `body_systems` | TEXT[] | e.g., `["cardiovascular", "endocrine"]` |

### `lab_results`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `patient_id` | UUID FK → patients | |
| `test_name` | TEXT | Normalized key (e.g., `hba1c`) |
| `test_name_display` | TEXT | Display name (e.g., `HbA1c`) |
| `value` | DECIMAL | Numeric result |
| `unit` | TEXT | e.g., `mg/dL` |
| `reference_range_low/high` | DECIMAL | Normal range |
| `is_abnormal` | BOOLEAN | |
| `test_date` | DATE | |
| `delta_from_prev` | DECIMAL | Change from previous reading |
| `rate_of_change` | DECIMAL | Rate of change |
| `prev_reading_id` | UUID (self-ref) | Linked list of readings |

### `observations`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `patient_id` | UUID FK → patients | |
| `source_type` | TEXT | `caregiver_voice`/`meera_call_log` |
| `caregiver_id` | UUID FK → caregivers | |
| `symptoms_reported` | TEXT[] | |
| `symptoms_denied` | TEXT[] | |
| `medications_taken` | BOOLEAN | |
| `medication_timing_notes` | TEXT | |
| `mobility_notes` | TEXT | |
| `mood` | TEXT | |
| `concerns_flagged` | TEXT[] | |
| `raw_transcript` | TEXT | Original voice transcription |

### `drug_interaction_results`

| Column | Type | Notes |
|---|---|---|
| `drug_a_id` / `drug_b_id` | UUID FK → medications | |
| `drug_a_generic` / `drug_b_generic` | TEXT | Generic names for cache lookup |
| `severity` | TEXT | `contraindicated`/`major`/`moderate`/`minor` |
| `mechanism` | TEXT | Clinical mechanism explanation |
| `final_urgency` | TEXT | `alert`/`watch`/`inform` (may be escalated by lab modifiers) |

### `crisis_packets`

One row per patient (UNIQUE on `patient_id`). Contains pre-computed JSON snapshots of medications, emergency contacts, lab results, prescribers, allergies, active alerts. Rebuilt nightly by Celery job.

### `document_chunks`

| Column | Type | Notes |
|---|---|---|
| `source_document_id` | UUID FK → source_documents | |
| `chunk_index` | INTEGER | Order within document |
| `text` | TEXT | Chunk content |
| `embedding` | vector(768) | For semantic search (hybrid: vector + full-text) |

### Other Tables

- `caregivers` — WhatsApp invitation status, visit schedule
- `calendar_events` — appointments, lab tests, caregiver visits; linked to source entities
- `medication_refills` — refill reminders with escalation status
- `notifications` — in-app + WhatsApp + push; direction (outbound/system_event)
- `clinical_hypotheses` — AI-generated hypotheses with urgency/confidence
- `conflict_records` — four types of data conflicts (A/B/C/D)
- `patient_state` — freshness scores + overall status (rebuilt nightly)
- `gap_actions` — missing pre-visit actions with escalation levels (0–5)
- `whatsapp_messages` — inbound/outbound message log
- `prescribers` — doctor profiles linked to medications
- `drug_generic_lookup` — brand→generic drug name mapping (seeded from CIMS/1mg data)

**Key relationships:**

```
users 1──* patients 1──* source_documents
                      1──* medications ──* drug_interaction_results
                      1──* lab_results
                      1──* observations
                      1──* caregivers
                      1──* calendar_events
                      1──1 crisis_packet
                      1──1 patient_state
                      1──* clinical_hypotheses
                      1──* notifications
```

---

## 📡 API Documentation

Base URL: `/api/v1`
Authentication: Supabase JWT (`Authorization: Bearer <token>`)
All patient-scoped routes enforce Row-Level Security — users can only access their own patients.

### Authentication

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/otp/send` | Send OTP to phone number |
| `POST` | `/auth/otp/verify` | Verify OTP → returns access + refresh tokens |
| `POST` | `/auth/google` | Google OAuth sign-in |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET` | `/auth/me` | Get current user profile |
| `PATCH` | `/auth/me` | Update name, preferences |
| `POST` | `/auth/me/phone/send-otp` | Start phone number update flow |
| `POST` | `/auth/me/phone/verify-otp` | Complete phone update |
| `DELETE` | `/auth/me/phone` | Remove phone number |
| `POST` | `/auth/me/whatsapp/verify` | Verify WhatsApp connection |

**OTP verify response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { "id": "uuid", "name": "string", "email": "string" }
}
```

---

### Patients

| Method | Path | Description |
|---|---|---|
| `POST` | `/patients` | Create patient |
| `GET` | `/patients` | List all patients for authenticated user |
| `GET` | `/patients/{patient_id}` | Get patient details |
| `PUT` | `/patients/{patient_id}` | Full update |
| `DELETE` | `/patients/{patient_id}` | Delete patient + CASCADE all data |

---

### Documents

| Method | Path | Description |
|---|---|---|
| `POST` | `/patients/{patient_id}/documents/upload-url` | Get signed Supabase Storage upload URL |
| `POST` | `/documents/{doc_id}/process` | Trigger AI extraction (queues Celery task) |
| `POST` | `/documents/{doc_id}/approve` | Approve extracted data → runs pipeline → writes to DB |
| `POST` | `/documents/{doc_id}/reject` | Reject extraction with reason |
| `GET` | `/patients/{patient_id}/documents` | List documents (filter: `?type=&status=`) |
| `GET` | `/documents/{doc_id}` | Get document + signed download URL |
| `PATCH` | `/documents/{doc_id}` | Manual edit of extracted fields |
| `DELETE` | `/documents/{doc_id}` | Hard delete |

**Upload flow:**
```
1. POST /upload-url  →  { upload_url, document_id }
2. PUT <upload_url> with file bytes (direct to Supabase Storage — no bytes via API)
3. POST /documents/{id}/process
4. GET /documents/{id}  (poll or Supabase Realtime subscription)
5. POST /documents/{id}/approve (with any field edits)
```

---

### Medications

| Method | Path | Description |
|---|---|---|
| `POST` | `/patients/{patient_id}/medications` | Create medication (triggers drug interaction check) |
| `GET` | `/patients/{patient_id}/medications` | List medications (`?active_only=true`) |
| `GET` | `/patients/{patient_id}/medications/{id}` | Get single medication |
| `PATCH` | `/patients/{patient_id}/medications/{id}` | Update |
| `DELETE` | `/patients/{patient_id}/medications/{id}` | Discontinue |

---

### Lab Results

| Method | Path | Description |
|---|---|---|
| `POST` | `/patients/{patient_id}/lab-results` | Create lab result |
| `GET` | `/patients/{patient_id}/lab-results` | List results |
| `GET` | `/patients/{patient_id}/lab-results/trend/{test_name}` | Time-series trend for a specific test |
| `GET` | `/patients/{patient_id}/lab-results/{id}` | Get single result |

---

### Observations (Caregiver Updates)

| Method | Path | Description |
|---|---|---|
| `POST` | `/patients/{patient_id}/observations` | Create observation |
| `GET` | `/patients/{patient_id}/observations` | List (`?source_type=caregiver_voice`) |
| `GET` | `/patients/{patient_id}/observations/{id}` | Get single observation |

---

### Caregivers

| Method | Path | Description |
|---|---|---|
| `POST` | `/patients/{patient_id}/caregivers` | Add caregiver (sends WhatsApp invitation) |
| `GET` | `/patients/{patient_id}/caregivers` | List caregivers (`?active_only=true`) |
| `GET` | `/patients/{patient_id}/caregivers/{id}` | Get caregiver |
| `PUT` | `/patients/{patient_id}/caregivers/{id}` | Update |
| `DELETE` | `/patients/{patient_id}/caregivers/{id}` | Remove |
| `POST` | `/patients/{patient_id}/caregivers/{id}/reinvite` | Resend WhatsApp invitation |

---

### Calendar

| Method | Path | Description |
|---|---|---|
| `POST` | `/patients/{patient_id}/calendar` | Create event |
| `GET` | `/patients/{patient_id}/calendar` | List events (`?within_days=30&status=confirmed`) |
| `GET` | `/patients/{patient_id}/calendar/{id}` | Get event |
| `PATCH` | `/patients/{patient_id}/calendar/{id}` | Update |
| `POST` | `/patients/{patient_id}/calendar/{id}/confirm` | Confirm suggested event |
| `DELETE` | `/patients/{patient_id}/calendar/{id}` | Cancel |

---

### Drug Interactions

| Method | Path | Description |
|---|---|---|
| `GET` | `/patients/{patient_id}/drug-interactions` | List detected interactions |
| `POST` | `/patients/{patient_id}/drug-interactions/check` | Trigger manual interaction check |
| `DELETE` | `/patients/{patient_id}/drug-interactions/{id}` | Dismiss false-positive (clears Redis cache) |

---

### Crisis

| Method | Path | Description |
|---|---|---|
| `GET` | `/patients/{patient_id}/crisis` | Get pre-computed crisis packet (Redis-cached, 1h TTL) |
| `POST` | `/patients/{patient_id}/crisis/enter` | Trigger crisis mode |
| `GET` | `/patients/{patient_id}/crisis/pdf` | Generate emergency card PDF → returns signed URL |
| `POST` | `/patients/{patient_id}/crisis/exit` | Exit crisis mode |
| `POST` | `/patients/{patient_id}/crisis/follow-up` | Post-crisis follow-up |

---

### Chatbot

| Method | Path | Description |
|---|---|---|
| `POST` | `/patients/{patient_id}/chatbot/query` | Agentic query (tool use, hybrid search, scheduling) |
| `POST` | `/patients/{patient_id}/chatbot/action/confirm` | Execute proposed action (confirmed by user) |
| `GET` | `/patients/{patient_id}/chatbot/suggested-prompts` | Context-aware suggested prompts |

**Query request:**
```json
{
  "query": "What tests does Dad need before his cardiology appointment?",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "local_time": "2026-05-16T10:00:00+05:30"
}
```

**Query response:**
```json
{
  "answer": "Before the cardiology appointment on May 20...",
  "query_type": "hybrid",
  "sources": ["Lab: HbA1c (2026-04-10)", "prescription (2026-03-15)"],
  "processing_steps": ["Fetched upcoming appointments", "Searched medical records"],
  "proposed_actions": null,
  "suggested_prompts": [{ "text": "Upload prescription", "query_type": "hybrid" }],
  "generated_at": "2026-05-16T10:00:00Z"
}
```

---

### Other Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/patients/{id}/notifications` | List notifications (`?status=unread`) |
| `POST` | `/patients/{id}/notifications/mark-read` | Mark as read |
| `PATCH` | `/patients/{id}/notifications/{nid}/acknowledge` | Acknowledge alert |
| `GET` | `/patients/{id}/state` | Freshness score + staleness (Redis, 5m TTL) |
| `GET` | `/patients/{id}/digest` | Build digest (`?period=morning\|evening`) |
| `GET` | `/patients/{id}/search` | Full-text + vector semantic search |
| `GET` | `/patients/{id}/doctor-briefing/{event_id}` | Generate pre-appointment briefing |
| `GET` | `/patients/{id}/doctor-briefing/{event_id}/pdf` | Briefing PDF → signed URL |
| `GET` | `/patients/{id}/medication-list-pdf` | Medication list PDF → signed URL |
| `GET` | `/patients/{id}/history` | Patient history aggregation |
| `GET` | `/patients/{id}/history/pdf` | History export PDF → signed URL |
| `POST` | `/patients/{id}/refills` | Create refill reminder |
| `GET` | `/patients/{id}/refills/due` | List due refills (`?within_days=7`) |
| `POST` | `/patients/{id}/refills/{rid}/confirm` | Mark refill done |
| `POST\|GET\|PATCH` | `/patients/{id}/prescribers/...` | Prescriber CRUD |
| `GET\|POST` | `/onboarding/...` | Onboarding progress |
| `POST` | `/webhooks/whatsapp` | Twilio inbound webhook |
| `GET` | `/r/{code}` | Expand shortlink redirect |
| `GET` | `/health` | DB + Redis ping |
| `GET` | `/metrics` | Prometheus metrics |

---

## ⏱️ Background Jobs

All jobs run via Celery Beat with IST timezone. Defined in `Backend/app/worker/jobs/`.

```
morning_digest
├─ Runs:   7:00 AM IST daily
├─ What:   Aggregates active alerts, upcoming appointments, due refills, gap actions
├─ Sends:  Push notification + WhatsApp to family caregiver
└─ File:   worker/jobs/morning_digest.py

evening_digest
├─ Runs:   9:30 PM IST daily
├─ What:   Aggregates caregiver observation summary, new hypotheses, medication adherence
├─ Sends:  Push notification + WhatsApp
└─ File:   worker/jobs/evening_digest.py

nightly_crisis_rebuild
├─ Runs:   2:00 AM IST daily
├─ What:   Pre-computes crisis packets for all patients; warms Redis cache
├─ Stores: crisis_packets table + Redis (1h TTL)
└─ File:   worker/jobs/nightly_crisis_rebuild.py

daily_gap_detection
├─ Runs:   6:00 AM IST daily
├─ What:   Scans upcoming appointments; detects missing pre-visit tests
├─ Creates: gap_actions rows with urgency + responsible party
└─ File:   worker/jobs/daily_gap_detection.py

refill_escalation
├─ Runs:   6:30 AM IST daily
├─ What:   Escalates pending refill reminders (T-10 → T-3 → T-0 days)
├─ Sends:  Progressive WhatsApp + push reminders
└─ File:   worker/jobs/refill_escalation.py

caregiver_visit_messages
├─ Runs:   8:00 AM IST daily
├─ What:   Sends pre-visit WhatsApp reminder to scheduled caregivers
└─ File:   worker/jobs/caregiver_visit_messages.py

deviation_check
├─ Runs:   12:00 PM IST daily
├─ What:   Detects ≥3 simultaneous alert-level hypotheses → escalation push
└─ File:   worker/jobs/deviation_check.py

staleness_check
├─ Runs:   8:00 PM IST daily
├─ What:   Rebuilds patient_state freshness scores for all patients
└─ File:   worker/jobs/staleness_check.py

caregiver_silence_detector
├─ Runs:   7:00 PM IST daily
├─ What:   Alerts if caregiver has been silent ≥3 days
└─ File:   worker/jobs/caregiver_silence_detector.py

caregiver_monthly_check
├─ Runs:   1st of month, 10:00 AM IST
├─ What:   Monthly re-engagement check for inactive caregivers
└─ File:   worker/jobs/caregiver_monthly_check.py

calendar_reminders
├─ Runs:   T-2 days before event
├─ What:   Pre-appointment reminders via push + WhatsApp
└─ File:   worker/jobs/calendar_reminders.py
```

---

## 🚀 Getting Started

### Prerequisites

- **Python** 3.11+
- **Node.js** 18+ (check `Frontend/package.json`)
- **PostgreSQL** via Supabase (create a project at [supabase.com](https://supabase.com))
- **Redis** 7+ (local or cloud — e.g., Upstash)
- **Accounts required:**
  - [Google AI Studio](https://aistudio.google.com) — Gemini API key
  - [Anthropic Console](https://console.anthropic.com) — Claude API key
  - [Twilio](https://twilio.com) — WhatsApp Sandbox + phone number
  - [Firebase Console](https://console.firebase.google.com) — FCM service account
  - [Sarvam AI](https://sarvam.ai) — Transcription API key

---

### Backend Setup

```bash
cd Backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# .\venv\Scripts\Activate.ps1   # Windows PowerShell

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env with your credentials (see Environment Variables below)

# Apply database migrations
# Option 1: Supabase CLI
supabase link --project-ref <your-project-ref>
supabase db push

# Option 2: Supabase Dashboard → SQL Editor → run each migration file in order
# Files: Backend/supabase/migrations/001_initial_schema.sql through 029_...

# Start API server
uvicorn app.main:app --reload --port 8000

# Start Celery worker (separate terminal)
celery -A app.worker.celery worker --loglevel=info

# Start Celery Beat scheduler (separate terminal)
celery -A app.worker.celery beat --loglevel=info
```

---

### Frontend Setup

```bash
cd Frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your credentials

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

---

### Environment Variables

#### Backend `.env`

```env
# ── App ──────────────────────────────────────────────────────────────
APP_NAME=CareCircle
ENVIRONMENT=development          # development | production
DEBUG=false

# ── Supabase ─────────────────────────────────────────────────────────
# Get from: supabase.com → Project Settings → API
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>              # Public anon key (safe for client)
SUPABASE_SERVICE_ROLE_KEY=<service-key>   # Secret — never expose to client
SUPABASE_JWT_SECRET=<jwt-secret>          # Project Settings → API → JWT secret

# Connection pooler (Session mode, port 6543)
SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-<region>.pooler.supabase.com:6543/postgres

# Storage bucket names (create in Supabase Dashboard → Storage)
SUPABASE_STORAGE_BUCKET_DOCUMENTS=carecircle-documents
SUPABASE_STORAGE_BUCKET_CRISIS_PDFS=carecircle-crisis-pdfs
SUPABASE_STORAGE_BUCKET_MED_PDFS=carecircle-med-pdfs

# ── Redis ─────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── Celery ───────────────────────────────────────────────────────────
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# ── AI Services ──────────────────────────────────────────────────────
# Get from: aistudio.google.com → Get API key
GEMINI_API_KEY=AIza...

# Get from: console.anthropic.com → API Keys
ANTHROPIC_API_KEY=sk-ant-...

# Get from: sarvam.ai → Dashboard → API Keys
SARAVAM_API_KEY=<key>
SARAVAM_API_URL=https://api.saravam.ai/v1/transcribe

# ── Firebase FCM ─────────────────────────────────────────────────────
# Get from: Firebase Console → Project Settings → Service Accounts → Generate key
# Download the JSON file and place it in Backend/
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json

# ── Twilio (WhatsApp + SMS) ──────────────────────────────────────────
# Get from: console.twilio.com
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=<auth-token>
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   # Twilio sandbox or approved number

# ── Frontend ─────────────────────────────────────────────────────────
# Used for WhatsApp deep-link CTAs sent to caregivers
FRONTEND_BASE_URL=https://care-circle-three.vercel.app
```

#### Frontend `.env.local`

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Supabase (same project — public keys only)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Google OAuth
# Get from: console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client ID
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com

# Firebase (for push notification token registration)
# Get from: Firebase Console → Project Settings → General → Your apps → Web app config
NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}
```

---

## 📁 Project Structure

```
CareCircle/
├── Backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app factory, middleware stack, router mounting
│   │   ├── config.py                  # Pydantic Settings (reads from .env)
│   │   ├── api/
│   │   │   ├── router.py             # Mounts all /api/v1 sub-routers
│   │   │   └── routes/               # One file per endpoint group
│   │   │       ├── auth.py           # /auth/* endpoints
│   │   │       ├── patients.py
│   │   │       ├── documents.py
│   │   │       ├── medications.py
│   │   │       ├── lab_results.py
│   │   │       ├── observations.py
│   │   │       ├── caregivers.py
│   │   │       ├── calendar.py
│   │   │       ├── refills.py
│   │   │       ├── drug_interactions.py
│   │   │       ├── notifications.py
│   │   │       ├── crisis.py
│   │   │       ├── digest.py
│   │   │       ├── chatbot.py
│   │   │       ├── search.py
│   │   │       ├── doctor_briefing.py
│   │   │       ├── prescribers.py
│   │   │       ├── history.py
│   │   │       ├── onboarding.py
│   │   │       ├── patient_state.py
│   │   │       └── webhooks.py       # Twilio inbound WhatsApp webhook
│   │   ├── core/
│   │   │   ├── database.py           # Asyncpg two-pool (service-role + user RLS)
│   │   │   ├── redis.py              # Redis client init
│   │   │   ├── security.py           # Supabase JWT verification (HS256)
│   │   │   ├── supabase.py           # Supabase admin + anon clients
│   │   │   ├── exceptions.py         # AppException hierarchy
│   │   │   └── logging.py            # structlog JSON config
│   │   ├── models/                   # asyncpg row-to-Pydantic models (21 tables)
│   │   ├── repositories/             # DB query layer (one repo per table)
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   ├── services/                 # Business logic (one service per domain)
│   │   ├── agents/                   # Specialized AI agents
│   │   │   ├── ingestion_orchestrator.py   # Post-approval flow coordinator
│   │   │   ├── drug_interaction_manager.py # Fan-out parallel Gemini calls
│   │   │   ├── drug_pair_worker.py         # Single drug pair Gemini check
│   │   │   ├── gap_detection_agent.py      # Pre-visit test gap detection
│   │   │   ├── calendar_writer_agent.py    # Auto-create calendar events
│   │   │   ├── crisis_mode_agent.py        # Crisis packet retrieval/rebuild
│   │   │   └── surface_agent.py            # Route ThreePartOutput to notifications
│   │   ├── pipeline/                 # Five-layer AI pipeline
│   │   │   ├── orchestrator.py       # PipelineOrchestrator — runs all 5 layers
│   │   │   ├── layer1_ingest/        # Document parsers (Gemini vision per type)
│   │   │   ├── layer2_normalize/     # Dimension tagger + source profiles
│   │   │   ├── layer3_enrich/        # 4 clinical rules + hypothesis writer
│   │   │   ├── layer4_reconcile/     # Conflict classifiers (Types A/B/C/D)
│   │   │   └── layer5_reason/        # LLM Three-Part formatter
│   │   ├── providers/
│   │   │   └── llm/                  # LLM provider abstraction
│   │   │       ├── base.py           # LLMProvider abstract class
│   │   │       └── gemini.py         # GeminiProvider (vision + embed + tools)
│   │   ├── cache/                    # Redis cache operation helpers
│   │   │   ├── crisis_packet_cache.py
│   │   │   └── drug_interaction_cache.py
│   │   ├── lib/                      # Utilities
│   │   │   ├── pdf_generator.py      # ReportLab PDF generation
│   │   │   ├── reranker.py           # LLM chunk reranker for chatbot search
│   │   │   ├── signed_url.py         # Supabase Storage signed URL helpers
│   │   │   └── dates.py              # Robust date parsing
│   │   └── worker/
│   │       ├── celery.py             # Celery app instance
│   │       ├── events.py             # Event handlers (on_medication_added, etc.)
│   │       └── jobs/                 # 11 scheduled background jobs
│   ├── supabase/
│   │   └── migrations/               # 29 ordered SQL migration files (001–029)
│   ├── docker/                       # Docker configuration
│   ├── scripts/                      # Utility scripts
│   ├── requirements.txt
│   └── .env.example
│
├── Frontend/
│   ├── app/                          # Next.js App Router pages
│   │   ├── layout.tsx               # Root layout + Providers
│   │   ├── (auth)/                  # Login, OTP, signup (no sidebar layout)
│   │   ├── onboarding/              # 5-step onboarding flow (patient, document, digest, caregiver, WhatsApp)
│   │   └── (app)/                   # Main app (sidebar layout)
│   │       ├── dashboard/
│   │       ├── medications/
│   │       ├── lab-results/
│   │       ├── observations/
│   │       ├── documents/
│   │       ├── calendar/
│   │       ├── drug-interactions/
│   │       ├── chatbot/
│   │       ├── crisis/
│   │       ├── doctor-briefing/
│   │       └── settings/
│   ├── components/                   # React components
│   │   ├── ui/                      # Base components (Button, Card, Badge, Modal)
│   │   ├── layout/                  # Sidebar, Topbar, NotificationBell, BottomNav
│   │   ├── documents/               # UploadZone, ApprovalModal, ExtractionReview
│   │   ├── crisis/                  # CrisisModal, emergency card sub-components
│   │   ├── chatbot/                 # ChatMessage, ChatInput, SuggestionChips, RouteTag
│   │   ├── pwa/                     # InstallPrompt, ServiceWorkerRegistrar, SplashScreen
│   │   ├── PatientProvider.tsx      # Multi-patient active patient context
│   │   └── Providers.tsx            # Root providers (Auth, Firebase, Google OAuth)
│   ├── lib/
│   │   ├── api/                     # Typed API client modules (one per domain)
│   │   ├── api/client.ts            # Base HTTP client (Bearer injection, 401 retry)
│   │   ├── auth-storage.ts          # localStorage token + user management
│   │   ├── firebase.ts              # FCM initialization
│   │   └── types.ts                 # TypeScript interfaces (mirror backend schemas)
│   ├── public/                      # Static assets + service worker
│   ├── package.json
│   └── .env.example
│
├── Files/                            # Documentation assets
├── PROJECT_CONTEXT.md                # Full AI assistant reference guide
├── CareCircle_Overview.pdf           # Visual project overview
└── README.md
```

---

## 🔒 Design Principles

### Human Approval Gate

All AI-extracted data requires explicit user approval before it enters the database. The flow:

```
document uploaded → AI extracts → status: "review_required"
  → user reviews field-by-field in ApprovalModal component
  → user approves  → status: "approved" → five-layer pipeline runs
     OR
  → user edits fields → pipeline runs on corrected data
     OR
  → user rejects   → status: "rejected" → document archived, no DB writes
```

Enforced at the API level: `PipelineOrchestrator` checks `document.user_approved_at is not None` and raises an error if missing (see `Backend/app/pipeline/orchestrator.py:66`).

### Two-Pool Database Architecture

Two asyncpg connection pools serve different purposes:

1. **User pool** — sets `app.user_id` PostgreSQL session variable → Row-Level Security enforces data isolation. Used by all user-facing API routes.
2. **Service-role pool** — bypasses RLS. Used by pipeline, agents, Celery jobs, and webhooks that write on behalf of the system (not a specific user).

Using the wrong pool is a **silent security bug** — service-role in an API route would allow cross-user data access without any error.

### LLM as Translator, Not Reasoner

The five-layer pipeline keeps all medical reasoning deterministic (layers 1–4). The LLM (Layer 5) only translates structured findings into human-readable text. This design:
- Makes the system auditable — every hypothesis traces to a specific deterministic rule
- Prevents LLM hallucination from influencing clinical decisions
- Keeps latency predictable — one LLM call per document, not one per rule

### Pre-Computation for Crisis Speed

The emergency card never queries the database in real-time. Everything is pre-computed nightly and cached in Redis. During an actual emergency, response time is <1 second regardless of database load.

### Structured Error Handling

All exceptions inherit from `AppException` (`Backend/app/core/exceptions.py`). `ErrorHandlerMiddleware` catches these and returns structured JSON:
- `NotFoundError` → 404
- `ForbiddenError` → 403
- `ValidationError` → 422
- `ConflictError` → 409

### Structured Logging

Every request gets a unique `X-Request-ID`. All log entries are JSON via structlog, with request context propagated through the middleware chain (`Backend/app/core/logging.py`).

---

## 🧪 Development Workflow

### Running Tests

```bash
cd Backend
pytest                           # Run all tests
pytest -k "test_medications"     # Filter by name
pytest --asyncio-mode=auto       # Explicit async mode
```

### Linting & Formatting

```bash
# Backend
ruff check app/                  # Lint
ruff format app/                 # Auto-format
mypy app/                        # Static type check

# Frontend
npm run lint                     # ESLint
```

### Database Migrations

Migrations are plain SQL files in `Backend/supabase/migrations/`. Apply via Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

supabase login
supabase link --project-ref <your-project-ref>

# Apply all pending migrations
supabase db push

# Create a new migration
supabase migration new <description>
```

**Critical:** Migration `016_fix_embedding_dimension.sql` changed the vector column from 1536 → 768 dimensions to match Gemini text-embedding-004 output. If you see embedding dimension errors, verify this migration has been applied.

---

## 🐛 Troubleshooting

**`asyncpg.exceptions.InvalidPasswordError`**
Supabase DB URL must include the project-ref subdomain: `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres`

**`vector dimension mismatch` on semantic search**
Migration 016 not applied. Run `supabase db push` or apply `016_fix_embedding_dimension.sql` manually in the Supabase Dashboard SQL editor.

**Drug interaction check returns no results**
- Verify Redis is reachable (`REDIS_URL` correct?)
- Verify Gemini API key has access to Gemini 1.5 Flash
- Patient needs ≥2 active medications — check with `GET /patients/{id}/medications?active_only=true`

**Celery tasks not running**
- Verify `CELERY_BROKER_URL` Redis is reachable from worker
- Run worker with `--loglevel=debug` to see task registration
- Beat schedule uses IST timezone — ensure `CELERY_TIMEZONE=Asia/Kolkata` is set

**WhatsApp webhook not receiving messages**
- Twilio webhook URL must be publicly accessible (use [ngrok](https://ngrok.com) for local dev)
- Webhook URL: `https://<your-domain>/api/v1/webhooks/whatsapp`
- Verify `TWILIO_AUTH_TOKEN` matches the value in Twilio Console

**CORS errors from frontend**
Allowed origins are defined in `Backend/app/main.py`. `http://localhost:3000` is included for local dev. Add your production domain and redeploy the backend.

**Firebase push notifications not arriving**
- `FIREBASE_CREDENTIALS_PATH` must point to a valid service account JSON in the `Backend/` directory
- Check browser/device has notification permission granted
- FCM token registration happens in `Frontend/lib/firebase.ts`

**`401 Unauthorized` on all API requests**
- `SUPABASE_JWT_SECRET` in backend `.env` must match Project Settings → API → JWT Secret in Supabase Dashboard
- Tokens expire — verify `NEXT_PUBLIC_API_URL` is correct and frontend refresh logic in `Frontend/lib/api/client.ts` is working

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Follow existing patterns:
   - Backend: async route → service → repository → model
   - New background jobs: `Backend/app/worker/jobs/`
   - New pipeline enrichment rules: `Backend/app/pipeline/layer3_enrich/rules/`
4. Run checks: `ruff check app/ && mypy app/ && pytest`
5. Submit a pull request with a clear description

**Code style:**
- Backend: Ruff formatting, type annotations required on all functions, async/await throughout
- Frontend: TypeScript strict mode, Tailwind for all styling, Radix for accessible interactive components
- No inline secrets; all configuration via environment variables

---

## 🙏 Acknowledgments

Built as a capstone project for **100xEngineers** — a program for building ambitious products with AI.

**Technologies that make CareCircle possible:**

| Technology | Role |
|---|---|
| [Google Gemini](https://ai.google.dev) | Vision OCR, text embeddings (768d), agentic tool use |
| [Anthropic Claude](https://anthropic.com) | LLM provider for reasoning layer |
| [Supabase](https://supabase.com) | PostgreSQL + pgvector + Auth + Storage + Realtime |
| [FastAPI](https://fastapi.tiangolo.com) | Async Python API framework |
| [Next.js](https://nextjs.org) | React framework with App Router |
| [Sarvam AI](https://sarvam.ai) | Hindi and regional language voice transcription |
| [Twilio](https://twilio.com) | WhatsApp Business API + SMS OTP |
| [Firebase](https://firebase.google.com) | Cross-platform push notifications (FCM) |
| [Celery](https://docs.celeryq.dev) + [Redis](https://redis.io) | Distributed task scheduling |
| [ReportLab](https://reportlab.com) | PDF generation for emergency cards and briefings |
