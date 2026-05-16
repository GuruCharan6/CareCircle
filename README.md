<div align="center">

# 🩺 CareCircle

### The Care Ecosystem That Was Never Assembled

**One place where prescriptions, lab reports, medications, appointments, caregivers, and emergencies — across multiple hospitals and multiple doctors — finally come together.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)](https://python.org/)
[![Gemini](https://img.shields.io/badge/AI-Gemini%20%2B%20Claude-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## The Situation

A 67-year-old man — diabetic, hypertensive, with a minor cardiac episode six months ago — now sees a cardiologist at one hospital, an endocrinologist at another, and a general physician at a third.

His prescriptions are photos in his daughter's WhatsApp. His lab reports are PDFs in two different hospital apps, one of which barely works on his phone. His medicine schedule is a handwritten note on the fridge that he sometimes follows. The part-time caregiver who visits three times a week sends updates via voice notes. The cardiologist changed his medication last week, but the family only found out on a Sunday phone call.

Last month, his new blood pressure medication was contraindicated with his diabetes medication. **Nobody caught it.** Not the cardiologist who prescribed it. Not the endocrinologist who manages his diabetes. Not the pharmacy that dispensed it.

This is not a hypothetical. India has over 140 million people above 60. Millions of working professionals in metro cities are managing their parents' health remotely. The care ecosystem is not broken. **It was never assembled in the first place.**

---

## What Exists Today (And Why It Fails)

| Option | What It Offers | What It Misses |
|--------|---------------|----------------|
| **Be the human integration layer** | Full context | Works until you miss one call, one detail, one interaction |
| **Hire a care manager** | Logistics coordination | Doesn't have the prescription from last Tuesday or the blood sugar spike three weeks ago |
| **Hospital apps** | Records from that hospital | Each app holds a fragment. None talk to each other. None alert on cross-hospital conflicts |
| **Family WhatsApp group** | All updates in one thread | No structure, no search. The medication change is 47 messages above the lunch photo |

**Every existing solution either requires the family to be the brain, or operates on a fragment of the picture. Nobody is connecting the dots across sources, across time, across the multiple people involved in care.**

---

## How CareCircle Solves It — Scenario by Scenario

The problem statement defines five scenarios that demand five different kinds of reasoning. Here is exactly how CareCircle handles each one.

---

### Scenario 1: The Drug Interaction Nobody Caught

> *The cardiologist prescribes Amlodipine for blood pressure. The endocrinologist has him on Metformin and Glimepiride for diabetes. The prescription is a photo in WhatsApp. The diabetes medications are in a Practo PDF from four months ago. There is no system that holds both prescriptions and can reason about interactions.*

**How CareCircle solves it:**

Upload any prescription — photo, PDF, or image. Google Gemini reads it using vision AI, extracts every medication with its dose and frequency, and saves it after your confirmation.

The moment a new medication is added, CareCircle runs an interaction check across **all active medications, regardless of which doctor prescribed them.** It doesn't matter if one prescription came from a cardiologist in Apollo and another from an endocrinologist in Max. CareCircle sees the full list.

Interactions are classified by severity:

| Severity | Action |
|----------|--------|
| `contraindicated` | Immediate push notification + dashboard alert |
| `major` | Push notification + dashboard alert |
| `moderate` | Dashboard watch card |
| `minor` | Dashboard info |

Context matters too. If creatinine is elevated and a renal-cleared drug is added, severity is automatically escalated. If blood sugar trends are rising and a glycemic drug is added, the flag goes up harder.

Every interaction alert includes: *"Flagged by AI — confirm with your prescribing doctor."* The system surfaces the conflict. The doctor resolves it.

---

### Scenario 2: Three Sources, Three Stories

> *The caregiver sends a voice note: "Uncle had dizziness this morning, did not eat breakfast, took all medicines." The patient tells the family on the phone: "felt fine, just a little tired." The lab report from last week shows fasting blood sugar was 180. Three sources, three different framings of the same morning. What is the ground truth?*

**How CareCircle solves it:**

CareCircle ingests all three sources and does not pick a winner. Instead, it passes them through a five-layer reasoning pipeline:

```
Layer 1: Ingest    → Voice note transcribed (Sarvam AI, Indian languages)
                     Lab report extracted (Gemini vision OCR)
                     Phone update logged as observation

Layer 2: Normalize → "did not eat breakfast" + fasting blood sugar 180
                     → contextually linked by date and timing

Layer 3: Enrich    → Compares against patient baseline:
                     Is 180 fasting glucose elevated for this patient?
                     Is dizziness consistent with the blood sugar reading?
                     Is "felt fine" plausible given the lab data?

Layer 4: Reconcile → Classifies the conflict:
                     Caregiver report vs. patient self-report = observational discrepancy
                     Lab data provides ground truth for glucose
                     Dizziness + missed breakfast + elevated glucose = coherent cluster

Layer 5: Reason    → LLM generates human-readable summary:
                     "Elevated fasting glucose (180) on [date] correlated with
                     reported dizziness. Patient self-report inconsistent with
                     caregiver observation. Monitor next 48 hours."
```

The conflict is surfaced — not hidden, not resolved arbitrarily. The family sees what the data actually says.

---

### Scenario 3: The Gap Nobody Scheduled

> *Dad has a cardiology follow-up in 10 days. His last blood test was 6 weeks ago. The cardiologist will want recent numbers. But nobody has scheduled the blood test. Nobody has reminded Dad. Nobody has coordinated with the caregiver. This is not a retrieval problem. It is a planning problem.*

**How CareCircle solves it:**

The moment a cardiology appointment is confirmed in the calendar, CareCircle runs a gap detection check:

> Does this patient have an ECG, CBC, creatinine, and lipid panel within the last 30 days?

If not, a care gap is created and surfaced in the Needs Attention dashboard. The required tests are suggested as calendar events — scheduled automatically 7 days before the appointment.

**Pre-visit requirements by specialist:**

| Specialist | Required Tests |
|-----------|---------------|
| Cardiologist | ECG, CBC, Creatinine, Lipid Panel, BP Log |
| Endocrinologist | Fasting Glucose, HbA1c, Creatinine, Urine Microalbumin |
| Nephrologist | Creatinine, eGFR, Urine Protein, Electrolytes |
| Neurologist | CBC, Metabolic Panel |
| General Physician | CBC, Metabolic Panel |
| *+ 5 more specialist profiles* | |

Two days before the appointment, a **doctor briefing PDF** is auto-generated containing: medications prescribed by other doctors (which the cardiologist may not know about), recent lab trends, and suggested questions based on active alerts. The family arrives prepared. The doctor has context.

---

### Scenario 4: The 2 AM Crisis

> *At 2 AM, the caregiver calls: "Uncle is having chest pain." The family needs to know, in the next 60 seconds: what medications he is on, what his last cardiac report said, which hospital is closest, and what the cardiologist's emergency number is. This is not a search moment. This is a crisis response moment.*

**How CareCircle solves it:**

One tap. The emergency card opens instantly.

The emergency card is **pre-computed nightly at 2:00 AM** — not generated on demand. There is no database query during a crisis, no loading spinner, no timeout.

**Emergency card contains:**
- All active medications with doses, frequencies, and prescribers
- Known allergies
- Blood type
- Emergency contacts (family members + confirmed caregivers)
- Active AI-flagged clinical alerts

The card is downloadable as a PDF — so a paramedic or emergency room doctor can receive it immediately without needing the app.

**How the system knows it's a crisis:**

CareCircle distinguishes between routine queries and emergencies. Crisis mode triggers when:
- The family or caregiver taps the "Emergency" button
- Keywords are detected in a voice note or observation: *chest pain, not breathing, collapsed, unconscious, heart attack, stroke, seizure, fainted*
- A late-night keyword (11 PM–5 AM) triggers with higher sensitivity

After the crisis, the caregiver submits a follow-up via WhatsApp. It's logged as an observation. The morning digest flags it for review.

---

### Scenario 5: The Silent Deviation

> *The prescription says "Metformin 500mg, twice daily, after meals." But the caregiver reports the patient has been taking it before meals for the past month. The system has the correct instruction. It has the caregiver's update. How does it detect the deviation? How does it communicate it without undermining the caregiver or alarming the family unnecessarily?*

**How CareCircle solves it:**

The pipeline's enrichment layer compares incoming caregiver observations against the structured medication record:

- Prescription: `Metformin 500mg | twice daily | after meals`
- Caregiver observation: `"takes Metformin before breakfast"`
- Enrichment rule: timing mismatch detected

The deviation is classified as a `watch` — not an `alert`. It surfaces as an in-app card without triggering a push notification. The language is clinical and neutral:

> *"Metformin timing discrepancy: prescribed after meals, caregiver reports before meals. Confirm with prescribing doctor at next visit."*

The caregiver is not blamed. The family is not alarmed. The doctor has the information at the next appointment.

---

## Core Features

### 📄 Document Intelligence

Every prescription, lab report, doctor note, or voice recording becomes structured data.

| Document Type | What Gets Extracted |
|--------------|---------------------|
| **Prescription** | Medications, doses, frequencies, prescriber, hospital, follow-up date |
| **Lab Report** | Test names, values, units, reference ranges, abnormal flags |
| **Doctor Note** | Observations, diagnoses, follow-up instructions, ordered tests |
| **Voice Note** | Transcribed in Indian languages, structured into observations |

**Every ingestion requires human approval.** AI extracts, you confirm. Nothing is written to the medical record without your review.

---

### 📊 Needs Attention Dashboard

Priority-ordered, real-time list of everything that needs action:

1. **Emergency Follow-ups** — post-crisis events requiring a note
2. **Suggested Appointments & Lab Tests** — AI-extracted, confirm with one tap
3. **Drug Interactions** — cross-prescriber conflicts, sorted by severity
4. **Refill Alerts** — medications due within 30 days, sorted by urgency
5. **Care Gaps** — missing pre-visit tests for upcoming appointments

Action-required items always surface first. Scroll to see everything.

---

### 💬 WhatsApp-First Communication

WhatsApp is the primary communication channel — because that's where Indian families actually live.

| Notification | When |
|-------------|------|
| Morning health digest | Daily, user-configured time |
| Evening summary | Daily, user-configured time |
| Refill due in 10 days | Automated |
| Refill due in 3 days | Escalated reminder |
| Refill overdue | Urgent alert |
| Caregiver visit reminder | Day of visit, 8:00 AM |
| Doctor appointment briefing | T-2 days |
| Crisis follow-up prompt | After emergency card opened |

Caregivers can respond YES/NO to prompts directly in WhatsApp. The entire core workflow works without opening the app.

---

### 👥 Caregiver Network

The part-time caregiver is part of the care ecosystem, not an afterthought.

- Invited via WhatsApp link — one tap to confirm
- Gets day-of visit reminders at 8:00 AM
- Sends post-visit voice notes via WhatsApp → auto-transcribed → added to patient observations
- Silence detected: flags caregivers with no activity after N days
- Monthly re-engagement check for inactive caregivers

---

### 🤖 AI Chatbot

Ask anything about the patient's health record in plain language:

- *"What medications is my father currently taking?"*
- *"Who prescribed Metformin and when?"*
- *"Were there any abnormal lab results last month?"*
- *"Do we have any appointments next week?"*

Actions proposed by the chatbot always require explicit confirmation before executing.

---

### 📅 Smart Calendar

- Prescriptions auto-create suggested follow-up appointments
- Ordered tests auto-scheduled 7 days before the appointment
- Pre-visit gap detection runs on every confirmed appointment
- Doctor briefing PDF generated 2 days before any appointment
- Caregiver visit scheduling with WhatsApp reminders

---

### 💊 Medication Management

- Full medication list across all prescribers
- Every medication linked back to the document it came from
- Duplicate detection on re-upload
- Refill tracking with escalating alerts
- Discontinued medication history preserved

---

### 🧪 Lab Results & Trends

- Auto-extracted from lab reports
- Trend view: last 5 results per test
- Abnormal flags against the report's own reference range
- When a lab report is uploaded, matching pending lab test calendar events are marked complete

---

## Background Automation

CareCircle runs scheduled jobs so nothing falls through the cracks — even when nobody is watching.

| Job | Time | Purpose |
|-----|------|---------|
| Morning digest dispatch | Per user timezone | Build and send morning health summary |
| Evening digest dispatch | Per user timezone | Build and send evening summary |
| Crisis card rebuild | 2:00 AM IST | Pre-compute emergency cards for all patients |
| Gap detection | 6:00 AM IST | Find missing pre-visit tests, create gap alerts |
| Refill escalation | 10:00 AM IST | Send and escalate overdue refill reminders |
| Caregiver visit reminders | 8:00 AM IST | WhatsApp messages for caregivers with visits today |
| Deviation check | 12:00 PM IST | Midday state rebuild, flag rapid deterioration signals |
| Staleness check | 8:00 PM IST | Evening freshness score update |
| Calendar reminders | T-2 days | Pre-appointment reminder |

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| API Framework | FastAPI 0.136 + Uvicorn |
| Language | Python 3.11 |
| Database | PostgreSQL (Supabase, asyncpg) |
| File Storage | Supabase Storage (direct signed-URL uploads) |
| Cache & Broker | Redis 6.4 |
| Task Queue | Celery 5.6 |
| Auth | Supabase Auth + JWT + Google OAuth |
| PDF Generation | ReportLab + Pillow |

### AI & ML
| Component | Technology |
|-----------|-----------|
| Document extraction | Google Gemini (vision + OCR) |
| Clinical reasoning | Anthropic Claude (prompt caching) |
| Voice transcription | Sarvam AI (Indian languages) |
| Drug interaction analysis | LLM pair evaluation |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | Next.js (App Router) + React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + Radix UI |
| Push Notifications | Firebase 12 (FCM) |

### Communications
| Component | Technology |
|-----------|-----------|
| WhatsApp & SMS | Twilio |
| Push Notifications | Firebase Cloud Messaging |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Family Member (Web / Mobile)               │
└────────────┬─────────────────────────────┬───────────────────┘
             │                             │
             ▼                             ▼
    ┌─────────────────┐          ┌──────────────────┐
    │  Next.js App    │          │ Supabase Storage  │
    │  (19 pages)     │          │ (direct upload)   │
    └────────┬────────┘          └────────┬──────────┘
             │                            │
             ▼                            ▼
    ┌──────────────────────────────────────────────────┐
    │                  FastAPI Backend                  │
    │                                                  │
    │  ┌──────────────┐     ┌────────────────────────┐ │
    │  │  REST API    │     │  AI Extraction         │ │
    │  │  (23 routes) │     │  (Google Gemini)       │ │
    │  └──────┬───────┘     └──────────┬─────────────┘ │
    │         │                        │                │
    │         ▼                        ▼                │
    │  ┌────────────────────────────────────────────┐   │
    │  │             PostgreSQL (Supabase)           │   │
    │  └────────────────────────────────────────────┘   │
    │                        │                           │
    │                        ▼                           │
    │  ┌────────────────────────────────────────────┐   │
    │  │              Celery + Redis                 │   │
    │  │                                            │   │
    │  │  ┌──────────────────────────────────────┐  │   │
    │  │  │  Five-Layer AI Pipeline              │  │   │
    │  │  │  Ingest → Normalize → Enrich         │  │   │
    │  │  │  → Reconcile → Reason → Surface      │  │   │
    │  │  └──────────────────────────────────────┘  │   │
    │  │                                            │   │
    │  │  9 Scheduled Background Jobs               │   │
    │  └────────────────────────────────────────────┘   │
    └──────────────────────────────────────────────────┘
             │                         │
             ▼                         ▼
    ┌──────────────┐         ┌─────────────────┐
    │    Twilio    │         │    Firebase     │
    │  (WhatsApp)  │         │  (Push / FCM)  │
    └──────────────┘         └─────────────────┘
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL (or Supabase project)
- Redis
- Accounts: Twilio, Google Cloud (Gemini API), Anthropic, Firebase, Sarvam AI

### Backend

```bash
cd Backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Fill in all values

# Apply migrations in Backend/supabase/migrations/ sequentially

uvicorn app.main:app --reload --port 8000

# Separate terminals:
celery -A app.core.celery worker --loglevel=info
celery -A app.core.celery beat --loglevel=info
```

### Frontend

```bash
cd Frontend
npm install
cp .env.example .env.local
# Fill in all values
npm run dev
```

### Environment Variables

**Backend `.env`**
```env
DATABASE_URL=
SUPABASE_URL=
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

## Design Principles

**1. Human approval gates everything**
AI extracts. You confirm. Nothing is written to the medical record without your explicit review. This is non-negotiable in a health context.

**2. The system never picks a winner in conflicts**
When caregiver reports conflict with patient self-reports, both are preserved. The pipeline classifies the conflict, the lab data provides ground truth where available, and the family sees the full picture.

**3. Proactive, not just reactive**
The system doesn't wait to be asked. If a blood test hasn't been scheduled before a follow-up, it surfaces the gap. If a refill is 10 days away, it sends a reminder. If it's 2 AM and there's a keyword, it switches modes.

**4. Alerts calibrated against fatigue**
False positives in a health context cause panic. False negatives cause harm. Every AI alert carries a disclaimer and is classified by severity. The threshold is conservative. The language is calm.

**5. WhatsApp-first for India**
The entire core workflow works over WhatsApp — alerts, reminders, caregiver updates, emergency follow-ups — without requiring the app to be open.

**6. Crisis mode is architecturally separate**
A system built for "What medications is he taking?" is different from a system built for "He is having chest pain right now." CareCircle treats these as distinct operating modes. The emergency card is pre-computed. It loads in under a second. Always.

---

## License

MIT

---

<div align="center">

*India has over 140 million people above 60.*
*Millions of families are managing their parents' health from another city.*
*The care ecosystem is not broken. It was never assembled.*

**CareCircle assembles it.**

</div>
