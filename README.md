<div align="center">

# 🩺 CareCircle

### AI-Powered Health Management for Families Managing Complex Care

**CareCircle helps families caring for elderly or chronically ill patients stay on top of medications, appointments, lab results, and emergencies — all in one place.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)](https://python.org/)
[![Gemini](https://img.shields.io/badge/AI-Gemini%20%2B%20Claude-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## The Problem

In India, millions of families are managing care for elderly parents or chronically ill relatives — often from a different city. The reality looks like this:

- A 68-year-old patient sees a cardiologist, an endocrinologist, and a general physician — **none of whom know what the others prescribed**
- The family WhatsApp group is flooded with photos of prescription chits, lab reports, and discharge summaries — **all unorganized**
- A refill is missed. A drug interaction goes unnoticed. An appointment is forgotten
- In an emergency at 2 AM, no one can find the medication list

**CareCircle solves all of this.**

---

## How It Works

### The Core Loop

```
Upload Document → AI Extracts → You Confirm → System Acts
```

Every prescription, lab report, or doctor's note you upload is processed by AI, reviewed by you, and then automatically:
- Saves medications to your medication list
- Flags drug interactions across all your doctors
- Creates calendar events for follow-up appointments and ordered lab tests
- Alerts your caregiver on WhatsApp if something needs attention

---

## Real Scenarios, Real Solutions

<table>
<tr>
<td width="50%">

### 🔴 Drug Interactions Across Doctors

**The Problem:**
Your father sees a cardiologist who prescribes Glimepiride and an endocrinologist who adds Rosuvastatin. Neither doctor sees the full picture.

**CareCircle:**
The moment a new prescription is uploaded and approved, CareCircle checks it against every active medication — regardless of which doctor prescribed it. Interactions are flagged by severity (contraindicated → major → moderate → minor) with clinical context. If creatinine is elevated, renal-cleared drugs are escalated automatically.

</td>
<td width="50%">

### 🟡 Missed Refills

**The Problem:**
Your mother takes 11 medications. Tracking refill dates mentally is impossible.

**CareCircle:**
Refill alerts appear in the dashboard and escalate via WhatsApp as the due date approaches — 10 days out, then 3 days, then overdue. Each medication tracks its own refill schedule independently.

</td>
</tr>
<tr>
<td width="50%">

### 🔵 Pre-Appointment Preparation

**The Problem:**
You arrive at the cardiologist's appointment without the ECG results he asked for last time. He has 8 minutes with you.

**CareCircle:**
When a cardiology appointment is confirmed, CareCircle checks: does the patient have an ECG, CBC, creatinine, and lipid panel within the last 30 days? If not, a care gap is created. Two days before the appointment, a doctor briefing PDF is auto-generated — medications from other doctors, recent lab trends, and suggested questions to ask.

</td>
<td width="50%">

### 🟢 Remote Family Management

**The Problem:**
You live in Bengaluru. Your parents live in Hyderabad. You have no idea how they're actually doing today.

**CareCircle:**
Every morning, you get a WhatsApp digest: active alerts, today's medications, upcoming appointments, recent lab results. Your caregiver sends a voice update after each visit — it's automatically transcribed and added to the patient record.

</td>
</tr>
<tr>
<td width="50%">

### 🚨 Medical Emergency

**The Problem:**
Your father collapses. The paramedic asks what medications he takes. No one can find the list.

**CareCircle:**
One tap opens the emergency card — all active medications with doses, allergies, blood type, and emergency contacts. Pre-computed nightly so it loads instantly, even on slow connections. Exportable as a PDF for paramedics.

</td>
<td width="50%">

### 📄 Document Chaos

**The Problem:**
Three years of prescriptions, lab reports, and discharge summaries live in WhatsApp photo albums and desk drawers.

**CareCircle:**
Upload any medical document. AI reads it, extracts structured data, and you confirm it in seconds. Everything becomes searchable. Ask: *"What was my HbA1c in March?"* or *"Which doctor prescribed Metformin?"*

</td>
</tr>
</table>

---

## Features

### 🤖 AI Document Extraction

Upload prescriptions, lab reports, doctor notes, or voice recordings. Google Gemini reads them and extracts:

- **Prescriptions** → medication name (generic + brand), dose, frequency, timing, prescriber, hospital, follow-up date
- **Lab Reports** → test name, value, unit, reference range, abnormal flags, lab name
- **Doctor Notes** → observations, diagnoses, follow-up instructions, ordered tests
- **Voice Notes** → transcribed in Indian languages via Sarvam AI, structured into observations

**Human approval is mandatory.** AI extracts, you confirm. Nothing is saved to your medical record without your review.

---

### 🧠 Five-Layer Clinical Pipeline

Every approved document passes through a reasoning pipeline before generating alerts:

| Layer | Name | What It Does |
|-------|------|-------------|
| 1 | **Ingest** | Converts document to normalized structure |
| 2 | **Normalize** | Standardizes drug names, units, date formats |
| 3 | **Enrich** | Compares against patient context — current meds, recent labs, known conditions |
| 4 | **Reconcile** | Classifies conflicts — duplicate medications, abnormal trends, dosing concerns |
| 5 | **Reason** | LLM translates findings into human-readable alerts with severity |

Output severity:
- `ALERT` → Push notification + in-app card (requires action)
- `WATCH` → In-app card (monitor)
- `INFORM` → Dashboard only (context)

*Every alert includes: "Flagged by AI — confirm with your prescribing doctor."*

---

### 📋 Needs Attention Dashboard

Priority-ordered list of everything requiring action or awareness:

1. **🚨 Emergency Follow-ups** — Post-crisis events needing a note
2. **📅 Suggested Appointments & Lab Tests** — AI-extracted, confirm with one tap
3. **⚠️ Drug Interactions** — Cross-prescriber conflicts sorted by severity
4. **💊 Refill Alerts** — Upcoming refills sorted by urgency
5. **📌 Care Gaps** — Missing pre-visit tests for upcoming appointments

Scrollable, real-time, and sorted so the most actionable items are always at the top.

---

### 📅 Smart Calendar

The calendar is connected to everything:

- **Auto-created events** — Pipeline extracts follow-up dates from prescriptions and creates `suggested` appointments
- **Lab test scheduling** — Ordered tests auto-scheduled 7 days before the follow-up appointment
- **Pre-visit gap detection** — Each confirmed appointment triggers a check for required tests by specialist type
- **Doctor briefing** — PDF generated 2 days before any appointment: meds from other doctors, lab trends, questions to ask
- **Caregiver visit tracking** — Recurring or one-off caregiver visits with WhatsApp reminders

**Gap detection by specialist:**

| Specialist | Required Pre-Visit Tests |
|-----------|--------------------------|
| Cardiologist | ECG, CBC, creatinine, lipid panel, BP log |
| Endocrinologist | Fasting glucose, HbA1c, creatinine, urine microalbumin |
| Nephrologist | Creatinine, eGFR, urine protein, electrolytes |
| Neurologist | CBC, metabolic panel, MRI (if applicable) |
| General Physician | CBC, metabolic panel |
| *+ 5 more specialist profiles* | |

---

### 🚨 Crisis / Emergency Mode

**How it triggers:**
- Patient or caregiver taps "Emergency" button
- Keyword detected in a voice note or observation: *chest pain, not breathing, collapsed, unconscious, heart attack, stroke, seizure, fainted*
- Late-night keyword (11 PM–5 AM) triggers with higher sensitivity

**Emergency card shows:**
- All active medications with doses and frequencies
- Prescriber for each medication
- Known allergies
- Blood type
- Emergency contacts (family + caregivers)
- Active AI-flagged clinical alerts

Pre-computed nightly at 2:00 AM so it loads in under a second during an emergency. Downloadable as a PDF for paramedics and emergency room doctors.

**Post-crisis:**
- Caregiver submits a follow-up note via WhatsApp
- Follow-up logged as an observation
- Morning digest flags it for the primary caregiver to review

---

### 💬 WhatsApp-First Communication

WhatsApp is the primary notification channel — built for Indian families who live on it.

| Notification | Channel | Trigger |
|-------------|---------|---------|
| Morning health digest | WhatsApp + Push | Daily at user-configured time |
| Evening summary | WhatsApp + Push | Daily at user-configured time |
| Refill due in 10 days | WhatsApp | Automated |
| Refill due in 3 days | WhatsApp (escalated) | Automated |
| Refill overdue | WhatsApp (urgent) | Automated |
| Caregiver visit reminder | WhatsApp | Day of visit, 8:00 AM |
| Doctor appointment briefing | WhatsApp | T-2 days |
| Crisis follow-up prompt | WhatsApp | After emergency card opened |

Caregivers can respond YES/NO to prompts directly in WhatsApp. Inbound messages are validated with Twilio HMAC-SHA1 signature verification.

---

### 👨‍👩‍👧 Caregiver Network

Connect family members and paid caregivers to the patient's care:

- **Invite via WhatsApp** — link sent, one tap to confirm
- **Visit scheduling** — recurring weekly schedule or one-off calendar events
- **Pre-visit reminders** — WhatsApp reminder at 8:00 AM on visit days
- **Post-visit updates** — caregiver sends voice note via WhatsApp → auto-transcribed → added to patient record
- **Engagement monitoring** — silence detector flags caregivers with no activity; monthly re-engagement nudge

---

### 💊 Medication Management

- Full medication list: generic name, brand name, dose, frequency, timing, prescriber
- Source-linked: every medication traces back to the document it came from
- Auto-extracted from prescriptions (no manual entry needed)
- Brand name normalization: strips "Tab.", "Cap.", "Inj." prefixes from drug names
- Duplicate detection: same generic on re-upload is skipped
- Refill date tracking with escalating alerts
- Discontinued medication history preserved

---

### 🧪 Lab Results & Trends

- Auto-extracted from lab reports (all tests in one upload)
- Manual entry supported
- Trend view: last 5 results per test name
- Abnormal flagging against the report's own reference range
- Auto-complete: when a lab report is uploaded, matching pending `lab_test` calendar events are automatically marked done
- Searchable: *"Show me HbA1c trend for the last 6 months"*

---

### 🤖 Chatbot

Ask questions about the patient's health record in plain language:

- *"What medications is my father currently on?"*
- *"Who prescribed Metformin and when?"*
- *"Are there any abnormal lab results from the last month?"*
- *"Do I have any appointments next week?"*

Intent classification routes queries to SQL (factual), semantic search (documents), or hybrid. Actions proposed by the chatbot require explicit confirmation before executing.

---

### 📊 Daily Digests

**Morning Digest** (user-configured time):
- All active `alert` and `watch` status items
- Today's medications
- Upcoming appointments (next 7 days)
- Lab results due for follow-up
- Caregiver visits today

**Evening Digest** (user-configured time):
- End-of-day health summary
- Pending confirmations (suggested appointments, lab tests)

Timezone-aware, delivered via WhatsApp and push notification.

---

## Background Automation

CareCircle runs scheduled jobs so nothing falls through the cracks:

| Job | Time | Purpose |
|-----|------|---------|
| Morning digest | Per user timezone | Build and send morning health summary |
| Evening digest | Per user timezone | Build and send evening summary |
| Crisis card rebuild | 2:00 AM IST | Pre-compute emergency packets for all patients |
| Gap detection | 6:00 AM IST | Find missing pre-visit tests, create gap alerts |
| Refill escalation | 10:00 AM IST | Send and escalate overdue refill reminders |
| Caregiver reminders | 8:00 AM IST | WhatsApp messages for caregivers with visits today |
| Deviation check | 12:00 PM IST | Midday state rebuild, flag rapid deterioration |
| Staleness check | 8:00 PM IST | Evening freshness score update |
| Calendar reminders | T-2 days | Pre-appointment reminder to patient |

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| API Framework | FastAPI 0.136 + Uvicorn |
| Language | Python 3.11 |
| Database | PostgreSQL (Supabase-hosted, asyncpg) |
| File Storage | Supabase Storage (direct signed-URL uploads) |
| Cache & Broker | Redis 6.4 |
| Task Queue | Celery 5.6 |
| Auth | Supabase Auth + JWT + Google OAuth |
| PDF Generation | ReportLab + Pillow |

### AI & ML
| Component | Technology |
|-----------|-----------|
| Document extraction | Google Gemini (vision + OCR) |
| Clinical reasoning | Anthropic Claude (with prompt caching) |
| Voice transcription | Sarvam AI (Indian languages) |
| Drug interactions | LLM pair evaluation |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | Next.js (App Router) + React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + Radix UI |
| Auth | Supabase client + Google OAuth |
| Push Notifications | Firebase 12 (FCM) |

### Communications
| Component | Technology |
|-----------|-----------|
| WhatsApp & SMS | Twilio |
| Push Notifications | Firebase Cloud Messaging |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User (Web / Mobile)                   │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
             ▼                            ▼
    ┌─────────────────┐         ┌──────────────────┐
    │  Next.js Frontend│         │  Supabase Storage│
    │  (19 pages)      │         │  (direct upload) │
    └────────┬────────┘         └────────┬─────────┘
             │                           │
             ▼                           ▼
    ┌─────────────────────────────────────────────┐
    │              FastAPI Backend                 │
    │                                             │
    │  ┌─────────────┐    ┌────────────────────┐  │
    │  │  23 Routes  │    │  Document Service  │  │
    │  │  (REST API) │    │  (Gemini extract)  │  │
    │  └──────┬──────┘    └────────┬───────────┘  │
    │         │                    │               │
    │         ▼                    ▼               │
    │  ┌─────────────────────────────────────┐    │
    │  │          PostgreSQL (Supabase)       │    │
    │  └─────────────────────────────────────┘    │
    │                    │                         │
    │                    ▼                         │
    │  ┌─────────────────────────────────────┐    │
    │  │        Celery + Redis               │    │
    │  │                                     │    │
    │  │  ┌──────────────────────────────┐   │    │
    │  │  │  5-Layer AI Pipeline         │   │    │
    │  │  │  Ingest → Normalize →        │   │    │
    │  │  │  Enrich → Reconcile →        │   │    │
    │  │  │  Reason → Surface            │   │    │
    │  │  └──────────────────────────────┘   │    │
    │  │                                     │    │
    │  │  Scheduled Jobs (9 daily tasks)     │    │
    │  └─────────────────────────────────────┘    │
    └─────────────────────────────────────────────┘
             │                    │
             ▼                    ▼
    ┌──────────────┐     ┌────────────────┐
    │   Twilio     │     │    Firebase    │
    │  (WhatsApp)  │     │    (Push FCM)  │
    └──────────────┘     └────────────────┘
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL database (or Supabase project)
- Redis instance
- Accounts: Twilio, Google Cloud (Gemini), Anthropic, Firebase, Sarvam AI

### Backend

```bash
cd Backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Fill in all values in .env

# Run database migrations
# Apply files in Backend/supabase/migrations/ sequentially

# Start API server
uvicorn app.main:app --reload --port 8000

# Start Celery worker (separate terminal)
celery -A app.core.celery worker --loglevel=info

# Start Celery beat for scheduled jobs (separate terminal)
celery -A app.core.celery beat --loglevel=info
```

### Frontend

```bash
cd Frontend

npm install

cp .env.example .env.local
# Fill in all values in .env.local

npm run dev
```

### Environment Variables

**Backend `.env`**
```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET_DOCUMENTS=documents
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
FIREBASE_SERVICE_ACCOUNT_JSON=
SARVAM_API_KEY=
JWT_SECRET=
```

**Frontend `.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_FIREBASE_CONFIG=
```

---

## Project Structure

```
CareCircle/
├── Backend/
│   ├── app/
│   │   ├── api/v1/routes/          # API endpoints (23 route files)
│   │   ├── agents/                 # AI agents
│   │   │   ├── ingestion_orchestrator.py
│   │   │   ├── calendar_writer_agent.py
│   │   │   ├── gap_detection_agent.py
│   │   │   └── surface_agent.py
│   │   ├── pipeline/               # 5-layer processing pipeline
│   │   │   ├── layer1_ingest/
│   │   │   ├── layer2_normalize/
│   │   │   ├── layer3_enrich/
│   │   │   ├── layer4_reconcile/
│   │   │   └── layer5_reason/
│   │   ├── services/               # Business logic layer
│   │   ├── repositories/           # Database access layer
│   │   ├── models/                 # ORM models
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── worker/
│   │   │   ├── tasks/              # Celery async tasks
│   │   │   └── jobs/               # Scheduled background jobs
│   │   └── providers/              # LLM, transcription, push providers
│   └── supabase/migrations/        # 27 SQL migration files
│
└── Frontend/
    ├── app/(app)/                  # 19 authenticated pages
    ├── components/                 # Reusable UI components
    ├── hooks/                      # Data fetching + state hooks
    └── lib/                        # API clients, types, utilities
```

---

## Design Principles

**1. Human approval gates everything**
AI extracts data from documents. Humans confirm it. No clinical information is ever written to the database without explicit user review and approval.

**2. Alerts don't cry wolf**
Every AI-generated alert carries a disclaimer: *"Flagged by AI — confirm with your prescribing doctor."* Severity thresholds are tuned conservatively to prevent alert fatigue.

**3. WhatsApp-first for India**
The entire core workflow — morning updates, refill reminders, caregiver coordination, emergency follow-ups — works entirely over WhatsApp without requiring the app to be open.

**4. Emergency readiness**
The emergency card is pre-computed nightly so it loads instantly. It never depends on a real-time database query during a crisis.

**5. Multi-prescriber by design**
Drug interaction checks always run across all active medications regardless of which doctor prescribed them. The system is built on the assumption that patients see multiple specialists who don't communicate with each other.

**6. Full audit trail**
Every AI decision is logged with patient ID, document ID, urgency level, and reasoning. Every medication and lab result is linked back to the source document it came from.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built for families navigating complex medical care in India.

</div>
