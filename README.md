# CareCircle

> AI-powered health management platform for patients with complex medication regimens and their caregivers.

CareCircle solves a real problem: elderly or chronically ill patients in India often see multiple specialists, take 8–15 medications simultaneously, and have no single source of truth for their health data. Family members managing care remotely have no visibility. Doctors see incomplete histories at appointments.

CareCircle centralizes everything — documents, medications, lab trends, appointments — and uses AI to surface what actually needs attention.

---

## The Problem It Solves

| Scenario | Without CareCircle | With CareCircle |
|----------|-------------------|-----------------|
| Patient sees 3 specialists, takes 12 meds | No one checks drug interactions across prescribers | Auto-detects all cross-prescriber interactions on upload |
| Family member 500km away | Calls patient daily, guesses status | Gets morning WhatsApp digest with alerts and upcoming events |
| Doctor appointment tomorrow | Patient arrives with paper chits | Doctor gets PDF briefing: meds from other doctors, lab trends, questions to ask |
| Patient uploads prescription | Data sits in a photo album | AI extracts medications, follow-up dates, ordered tests; creates calendar events |
| Lab report uploaded | Patient can't interpret values | Trends charted, abnormal values flagged, gaps detected (test overdue?) |
| Emergency at 2 AM | Paramedic has no med list | One-tap emergency card: all meds, doses, allergies, blood type, contacts |
| Refill due in 3 days | Patient forgets | WhatsApp alert with escalating urgency |

---

## Features

### Document Intelligence

Upload any medical document — CareCircle extracts structured data automatically.

**Supported document types:**
- Prescriptions (PDF, image) — extracts medications, doses, frequencies, prescriber, follow-up date
- Lab reports — extracts test names, values, units, reference ranges, flags abnormals
- Doctor notes — extracts observations, diagnoses, follow-up instructions
- Voice notes — transcribed via Sarvam AI (Indian language support), extracted for observations

**Extraction flow:**
1. Upload → direct to Supabase Storage (never touches backend)
2. AI extraction via Google Gemini (vision + OCR)
3. User reviews extracted data, edits if needed, approves or rejects
4. On approval → medications/labs saved to domain tables
5. Five-layer pipeline runs: normalize → enrich → reconcile → reason → surface

Every ingestion requires human approval. AI never silently writes clinical data.

---

### Five-Layer AI Pipeline

Every approved document passes through a deterministic + AI reasoning pipeline:

```
Layer 1: Ingest       → Extract structured data from document
Layer 2: Normalize    → Standardize units, dates, drug names, test names
Layer 3: Enrich       → Compare against patient context (current meds, recent labs)
                        Deterministic rules first, then LLM general reasoning
Layer 4: Reconcile    → Classify conflicts (duplicate meds, abnormal trends, dosing concerns)
Layer 5: Reason       → LLM translates hypotheses into human-readable summary
                        Returns: known_facts, clinical_summary, action_items
```

Output routes via urgency:
- `alert` → Push notification + in-app card
- `watch` → In-app card only
- `inform` → Silent (dashboard only)

Every alert includes: *"Flagged by AI — confirm with prescribing doctor."*

---

### Needs Attention Dashboard

Real-time priority list, sorted by urgency:

1. **Emergency Follow-ups** — crisis events requiring note
2. **Suggested Appointments / Lab Tests** — AI-extracted, awaiting user confirmation
3. **Drug Interactions** — cross-prescriber conflicts flagged
4. **Refill Alerts** — medications due within 30 days
5. **Care Gaps** — preventive tests overdue before upcoming appointment

Confirmation items surface first. One tap confirms an AI-suggested appointment directly to the calendar.

---

### Drug Interaction Detection

Every new medication triggers an interaction check against all active medications.

- Checks all medication pairs via LLM
- Severity levels: `contraindicated` / `major` / `moderate` / `minor`
- Contextual escalation:
  - Renal-cleared drug + elevated creatinine → severity bumped up
  - Glycemic drug + rising glucose trend → severity bumped up
- Results cached in Redis, invalidated on medication change
- Full interaction list viewable in dedicated Drug Interactions page

---

### Smart Calendar

Appointments don't just sit — they trigger work:

- **AI-suggested events**: Pipeline extracts follow-up dates from prescriptions/notes → creates `suggested` calendar event → shows in Needs Attention for confirmation
- **Lab test scheduling**: Ordered tests (from prescription) auto-scheduled 7 days before follow-up appointment
- **Gap detection**: Each confirmed appointment triggers a check — does patient have required pre-visit tests within 30 days?
  - Cardiologist → ECG, CBC, creatinine, lipid panel, BP log
  - Endocrinologist → fasting glucose, HbA1c, creatinine, urine microalbumin
  - General physician → CBC, metabolic panel
  - *(9 specialist profiles total)*
- **Doctor Briefing PDF**: 2 days before appointment → auto-generated briefing: meds from other doctors, recent lab trends, suggested questions

---

### Crisis / Emergency Mode

**Trigger methods:**
- Manual: patient or caregiver taps "Emergency Card" button
- Keyword detection: "chest pain", "not breathing", "collapsed", "unconscious", "heart attack", "stroke", "seizure", etc.
- Unusual hour (11 PM–5 AM) + keyword → higher likelihood of trigger

**Emergency Card contains:**
- All active medications (brand, generic, dose, frequency, prescriber)
- Known allergies
- Blood type
- Emergency contacts (family + confirmed caregivers)
- Active AI-flagged alerts

Pre-computed nightly at 2:00 AM so it's instant when needed — no DB queries during emergency.

**Post-crisis workflow:**
- Caregiver submits follow-up via WhatsApp
- Follow-up logged as observation + in-app notification
- Morning digest flags for clinician review

---

### Caregiver Network

Family members and paid caregivers get dedicated workflows:

- Invited via WhatsApp link
- Get daily 8:00 AM visit reminders for scheduled visits
- Send post-visit voice notes via WhatsApp → auto-ingested as observations
- Silence detector flags caregivers inactive for N days
- Monthly re-engagement check for inactive caregivers

---

### WhatsApp Integration

WhatsApp is the primary communication channel (built for Indian families).

- **Morning digest**: health summary + alerts + upcoming events → WhatsApp + push
- **Evening digest**: end-of-day summary
- **Refill alerts**: escalating reminders as due date approaches
- **Caregiver reminders**: visit schedule, patient updates
- **Doctor briefing CTA**: link to pre-appointment summary
- **YES/NO confirmations**: caregivers respond to prompts directly in WhatsApp
- **Inbound webhook**: Twilio HMAC-SHA1 signature validation on every message

---

### Medication Management

- Full medication list with dose, frequency, timing, prescriber
- Active/discontinued tracking
- Source document linked (which prescription it came from)
- Duplicate detection on upload (same generic name → skip)
- Drug name normalization: removes "Tab.", "Cap.", "Inj." prefixes
- Refill tracking with escalating WhatsApp alerts (10 days → 3 days → overdue)
- Medication list PDF for doctor visits

---

### Lab Results & Trends

- Manual entry or auto-extracted from lab reports
- Trend view: last 5 results per test
- Abnormal flag: compares against reference range from the report
- Lab auto-complete: when lab report uploaded, matching pending `lab_test` calendar events marked complete
- Reference ranges stored per result (different labs use different ranges)

---

### Chatbot

Context-aware query assistant:

- Intent classification: SQL (factual lookups) / semantic (doc search) / hybrid
- Can answer: "What did my last HbA1c show?", "Which doctor prescribed Metformin?", "Do I have any appointments next month?"
- Suggests context-aware prompts based on patient state
- Proposed actions require explicit user confirmation before executing

---

### Digests

**Morning digest** (user-configured time):
- Active alerts and watches
- Medications due today
- Upcoming appointments (next 7 days)
- Recent lab abnormals
- Caregiver visit schedule

**Evening digest** (user-configured time):
- End-of-day summary
- Reminder for pending confirmations

Delivered via WhatsApp + push notification. Times and timezone configurable per patient.

---

### Scheduled Background Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Morning digest dispatch | Per user timezone | Build + send morning health summary |
| Evening digest dispatch | Per user timezone | Build + send evening summary |
| Nightly crisis rebuild | 2:00 AM IST | Pre-compute emergency cards for all patients |
| Daily gap detection | 6:00 AM IST | Find missing pre-visit tests, overdue refills |
| Refill escalation | 10:00 AM IST | Send escalating refill reminders |
| Caregiver visit messages | 8:00 AM IST | WhatsApp reminders to caregivers with visits today |
| Deviation check | 12:00 PM IST | Midday state rebuild, flag rapid-deterioration patients |
| Staleness check | 8:00 PM IST | Evening state rebuild, keep freshness scores current |
| Calendar reminders | T-2 days | Appointment reminders to patient + caregiver |

---

## Tech Stack

### Backend
- **Runtime**: Python 3.11
- **Framework**: FastAPI 0.136 + Uvicorn
- **Database**: PostgreSQL via asyncpg (Supabase-hosted)
- **Storage**: Supabase Storage (direct signed-URL uploads, never touches backend)
- **Cache / Broker**: Redis 6.4
- **Task Queue**: Celery 5.6
- **Auth**: Supabase Auth + JWT (python-jose), OTP via SMS, Google OAuth

### AI / ML
- **Document extraction**: Google Gemini (vision + OCR)
- **Pipeline reasoning**: Anthropic Claude (with prompt caching)
- **Voice transcription**: Sarvam AI (Indian languages)
- **Drug interaction analysis**: LLM-powered pair evaluation

### Frontend
- **Framework**: Next.js (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS 4, Radix UI components
- **Auth**: Supabase client + Google OAuth
- **Push**: Firebase 12

### Communications
- **WhatsApp / SMS**: Twilio
- **Push notifications**: Firebase Cloud Messaging (FCM)
- **PDF generation**: ReportLab + Pillow

### Observability
- **Logging**: structlog (structured JSON)
- **Metrics**: Prometheus client
- **Retry logic**: Tenacity

---

## Architecture

```
User (mobile/web)
    │
    ├── Upload document → Supabase Storage (direct PUT, signed URL)
    │        │
    │        └── POST /documents/{id}/process
    │                 │
    │                 └── Gemini extraction (sync, 5-30s)
    │                          │
    │                          └── User reviews + approves
    │                                   │
    │                                   └── on_document_approved event
    │                                            │
    │                                            └── Celery: run_pipeline task
    │                                                     │
    │                                                     ├── 5-layer pipeline
    │                                                     ├── CalendarWriterAgent
    │                                                     ├── GapDetectionAgent
    │                                                     └── SurfaceAgent → notifications
    │
    ├── Dashboard polls /state → real-time alerts, watches, suggested items
    │
    └── WhatsApp (Twilio) ← → inbound webhook → caregiver responses
```

---

## API Overview

All endpoints under `/api/v1/`. Auth via Bearer token (JWT).

| Domain | Base Path | Key Operations |
|--------|-----------|----------------|
| Auth | `/auth` | OTP send/verify, Google OAuth, token refresh |
| Patients | `/patients` | CRUD |
| Medications | `/patients/{id}/medications` | CRUD + refill tracking |
| Lab Results | `/patients/{id}/lab-results` | CRUD + trend view |
| Documents | `/documents` | Upload URL, process, approve, reject |
| Calendar | `/patients/{id}/calendar` | CRUD + confirm + gap detection |
| Caregivers | `/patients/{id}/caregivers` | CRUD + WhatsApp invite |
| Drug Interactions | `/patients/{id}/drug-interactions` | List + trigger check |
| Crisis | `/patients/{id}/crisis` | Enter, exit, PDF, follow-up |
| Chatbot | `/patients/{id}/chatbot` | Query, confirm action, suggested prompts |
| Digest | `/patients/{id}/digest` | On-demand build + preference update |
| Search | `/patients/{id}/search` | Universal search across all data |
| Notifications | `/patients/{id}/notifications` | List, unread count, mark read |
| Patient State | `/patients/{id}/state` | Snapshot: alerts, freshness, summary |
| Onboarding | `/onboarding` | Progress, step completion |
| WhatsApp Webhook | `/webhooks/whatsapp` | Twilio inbound (HMAC validated) |

---

## Onboarding Flow

New users complete 5 steps (1–3 mandatory, 4–5 optional):

1. **Add patient** — name, age, gender, conditions, allergies, blood type
2. **Add medications** — current active medications
3. **Set digest times** — morning/evening times + timezone
4. *(Optional)* **Add caregiver** — WhatsApp invite
5. *(Optional)* **Connect WhatsApp** — verify digest delivery channel

Progress persists across sessions. Mandatory steps block core features until complete.

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL (or Supabase project)
- Redis
- Celery worker
- Twilio account (WhatsApp Business API)
- Google Gemini API key
- Anthropic API key
- Firebase project (FCM)
- Sarvam AI API key (voice transcription)

### Backend Setup

```bash
cd Backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copy and fill environment variables
cp .env.example .env

# Run migrations
# Apply SQL files in Backend/supabase/migrations/ in order

# Start API server
uvicorn app.main:app --reload --port 8000

# Start Celery worker (separate terminal)
celery -A app.core.celery worker --loglevel=info

# Start Celery beat scheduler (separate terminal)
celery -A app.core.celery beat --loglevel=info
```

### Frontend Setup

```bash
cd Frontend
npm install

# Copy and fill environment variables
cp .env.example .env.local

npm run dev
```

### Environment Variables

**Backend** (`.env`):
```
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET_DOCUMENTS=
REDIS_URL=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
FIREBASE_SERVICE_ACCOUNT_JSON=
SARVAM_API_KEY=
JWT_SECRET=
```

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FIREBASE_CONFIG=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

---

## Project Structure

```
CareCircle/
├── Backend/
│   ├── app/
│   │   ├── api/v1/routes/          # 23 route files
│   │   ├── agents/                 # AI agents (calendar, gap, crisis, surface)
│   │   ├── pipeline/               # 5-layer processing pipeline
│   │   │   ├── layer1_ingest/
│   │   │   ├── layer2_normalize/
│   │   │   ├── layer3_enrich/
│   │   │   ├── layer4_reconcile/
│   │   │   └── layer5_reason/
│   │   ├── services/               # Business logic
│   │   ├── repositories/           # DB access layer
│   │   ├── models/                 # ORM models
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── worker/
│   │   │   ├── tasks/              # Celery tasks (extract, pipeline, interactions)
│   │   │   └── jobs/               # Scheduled jobs (digest, gap, refill, crisis)
│   │   └── providers/              # LLM, transcription, push notification providers
│   └── supabase/migrations/        # 27 SQL migration files
│
└── Frontend/
    ├── app/(app)/                  # 19 authenticated pages
    ├── components/                 # Reusable UI components
    ├── hooks/                      # Data fetching hooks
    └── lib/                        # API clients, types, utilities
```

---

## Design Principles

1. **Human approval gates everything** — AI extracts, human confirms. No silent writes to clinical records.
2. **Alerts never cry wolf** — Every AI alert carries a disclaimer. Severity thresholds tuned to avoid fatigue.
3. **WhatsApp-first for India** — Core workflows (alerts, reminders, caregiver updates) work entirely over WhatsApp without opening the app.
4. **Offline-safe data** — Emergency card pre-computed nightly. Crisis mode works even if network is slow.
5. **Multi-prescriber aware** — Drug interaction checks always run across all active medications regardless of which doctor prescribed them.
6. **Structured logging everywhere** — Every AI decision is logged with patient_id, document_id, urgency, and reasoning for audit trail.

---

## License

MIT
