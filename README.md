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

## The Problem

Millions of working professionals in India manage their elderly parents' health from a distance — across multiple hospitals, different doctors who don't talk to each other, and part-time caregivers who report inconsistently. The result is a fragmented, dangerous mess:

- **Dr. A prescribes Metformin. Dr. B prescribes Glibenclamide.** Nobody checks if these interact. The patient silently takes both.
- **The caregiver says Dad is "fine." Dad says he's "better." The lab report says HbA1c is 9.2%.** Three sources contradict each other — nobody reconciles them.
- **There's a cardiologist appointment next Tuesday.** Nobody noticed the pre-appointment ECG was never ordered.
- **It's 2 AM. Dad collapsed.** The ER nurse asks for his medication list. Nobody can find it.
- **The caregiver changed medication timing from 8 AM to 9 PM** — a 13-hour shift that no one noticed.

Existing solutions fail because they are either: (1) static record repositories with no intelligence, (2) single-hospital portals that can't see across providers, or (3) generic reminder apps that don't understand medical context.

**CareCircle solves all five scenarios above with AI that works across every provider, document, and caregiver your family uses.**

---

## Solution

CareCircle is a GenAI-powered care coordination platform that ingests health documents (prescriptions, lab reports, voice notes), runs them through a **five-layer AI reasoning pipeline**, and surfaces actionable intelligence to family caregivers — before problems escalate.

**Who it's for:** Adult children (25–45 years) remotely managing a parent's chronic illness across multiple providers in India.

**Cross-platform:** Progressive Web App (PWA) works on any device — iOS, Android, desktop — without app store downloads. Install once, works offline.

**What makes it different:** The AI pipeline is deterministic — LLMs only format data, they never generate medical hypotheses. This prevents hallucinations from influencing clinical decisions. Every alert traces back to a specific rule or lab value, not LLM guesswork.

---

## Key Features

- **🔍 Drug Interaction Detection** — Checks all active medications pairwise. Lab values (creatinine, glucose) modify severity. Alert-level interactions trigger push notifications.
- **📄 Prescription & Lab OCR** — Google Gemini vision extracts medications, doses, lab values. Confidence scoring flags ambiguous fields for human review.
- **🧠 Five-Layer AI Pipeline** — Deterministic reasoning (Layers 1-4) + LLM formatting (Layer 5). No hallucinations. Every hypothesis is auditable.
- **⚡ Pre-Computed Crisis Cards** — Emergency packet rebuilds nightly at 2 AM, cached in Redis. Loads in <1 second during emergencies.
- **🔄 Multi-Source Reconciliation** — Detects when caregiver notes, patient self-reports, and lab data conflict. Classifies conflict type (temporal/observational/dimensional/factual).
- **📅 Proactive Care Gap Detection** — Flags missing pre-visit tests before appointments. Creates reminder workflows.
- **💬 WhatsApp-First Design** — Morning/evening digests, medication reminders, caregiver updates — all via WhatsApp without requiring app install.
- **📱 Progressive Web App (PWA)** — Install on any device (iOS, Android, Desktop). Works offline with cached data. No app store required.
- **🤖 AI Chatbot with Tool Use** — Query patient data in natural language. Schedule events, log observations, generate doctor briefings.

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Backend** | FastAPI 0.136, Python 3.11+, asyncpg, Celery 5.6, Redis 6.4 |
| **Frontend** | Next.js 16.2, React 19, TypeScript 5, Tailwind CSS, Radix UI, PWA (Service Workers) |
| **Database** | PostgreSQL (Supabase), pgvector (768d embeddings), Row Level Security |
| **AI/ML** | Google Gemini 2.5 Flash (vision, LLM, embeddings), Sarvam AI (Hindi STT) |
| **External APIs** | Twilio (WhatsApp), Firebase (push notifications), Prometheus (metrics) |
| **Infrastructure** | Supabase (auth, storage, realtime), Redis (cache, job queue), ReportLab (PDF) |

---

## Architecture

CareCircle uses a **five-layer AI pipeline** where each layer has a specific responsibility:

1. **Layer 1 (Ingest):** OCR extraction via Gemini vision. Confidence scoring (<0.7 → manual review required).
2. **Layer 2 (Normalize):** Tags health dimension (biochemical, behavioral, subjective, clinical).
3. **Layer 3 (Enrich):** Generates clinical hypotheses via deterministic rules, not LLMs.
4. **Layer 4 (Reconcile):** Detects conflicts between caregiver/patient/lab data. Classifies conflict type.
5. **Layer 5 (Reason):** LLM translates structured findings → human-readable text. **No medical reasoning happens here.**

**Two-pool database architecture:** User pool enforces Row Level Security. Service-role pool bypasses RLS for background jobs and pipeline writes.

**Crisis mode architecture:** Emergency packets pre-computed nightly, stored in Redis (1h TTL). `GET /crisis` hits cache, never queries DB.

See [Architecture Deep Dive](docs/ARCHITECTURE.md) and [Pipeline Details](docs/PIPELINE.md) for full technical breakdown.

---

## Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **Redis** (local or cloud instance)
- **Supabase account** (for PostgreSQL + Auth + Storage)
- **API Keys:** Google Gemini, Twilio, Firebase, Sarvam AI

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/yourusername/carecircle.git
cd carecircle
```

**2. Backend setup**
```bash
cd Backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env with your API keys (see Environment Variables below)
```

**3. Database setup**
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your Supabase project
supabase login
supabase link --project-ref <your-project-ref>

# Apply migrations
supabase db push
```

**4. Start backend services**
```bash
# Terminal 1: API server
uvicorn app.main:app --reload --port 8000

# Terminal 2: Celery worker
celery -A app.worker.celery_app worker --loglevel=info

# Terminal 3: Celery beat (scheduled jobs)
celery -A app.worker.celery_app beat --loglevel=info
```

**5. Frontend setup**
```bash
cd Frontend
npm install
cp .env.example .env.local
# Edit .env.local with your API URLs

npm run dev
```

**6. Open in browser**
```
http://localhost:3000
```

---

## Environment Variables

### Backend `.env`

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres.<ref>:password@...` |
| `SUPABASE_URL` | Supabase project URL | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) | `eyJ...` |
| `SUPABASE_JWT_SECRET` | JWT secret for token validation | `your-jwt-secret` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `CELERY_BROKER_URL` | Same as REDIS_URL | `redis://localhost:6379/0` |
| `GEMINI_API_KEY` | Google AI API key | `AIza...` |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | `AC...` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | `...` |
| `TWILIO_WHATSAPP_FROM` | WhatsApp number | `whatsapp:+14155238886` |
| `FIREBASE_CREDENTIALS_PATH` | Path to Firebase service account JSON | `./firebase-admin.json` |
| `SARVAM_API_KEY` | Sarvam AI API key | `...` |

See [full environment variables list](docs/SETUP.md#environment-variables) for all configuration options.

### Frontend `.env.local`

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (http://localhost:8000) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |

---

## Project Structure

```
CareCircle/
├── Backend/
│   ├── app/
│   │   ├── api/                    # API routes (75+ endpoints)
│   │   ├── pipeline/               # Five-layer AI pipeline
│   │   │   ├── layer1_ingest/      # OCR, voice transcription
│   │   │   ├── layer2_normalize/   # Health dimension tagging
│   │   │   ├── layer3_enrich/      # Hypothesis generation (rules)
│   │   │   ├── layer4_reconcile/   # Conflict detection
│   │   │   └── layer5_reason/      # LLM formatting
│   │   ├── agents/                 # Specialized agents (drug interaction, gap detection, crisis)
│   │   ├── services/               # Business logic layer
│   │   ├── repositories/           # Database access layer
│   │   ├── models/                 # SQLAlchemy models
│   │   ├── providers/              # External API wrappers (Gemini, Twilio, Firebase, Sarvam)
│   │   ├── worker/                 # Celery jobs (11 scheduled tasks)
│   │   └── core/                   # Config, exceptions, logging
│   ├── supabase/
│   │   └── migrations/             # Database migrations (29 files)
│   └── requirements.txt
├── Frontend/
│   ├── app/                        # Next.js App Router pages
│   ├── components/                 # React components
│   ├── lib/                        # API client, utilities
│   └── package.json
├── docs/                           # Detailed documentation
│   ├── PIPELINE.md                 # Five-layer pipeline deep dive
│   ├── API.md                      # All API endpoints
│   ├── DATABASE.md                 # Schema and migrations
│   ├── BACKGROUND_JOBS.md          # Scheduled tasks
│   ├── ARCHITECTURE.md             # Design principles
│   └── TROUBLESHOOTING.md          # Common issues
└── README.md
```

---

## Documentation

- **[Pipeline Details](docs/PIPELINE.md)** — How the five-layer AI pipeline works
- **[API Documentation](docs/API.md)** — All 75+ endpoints with request/response schemas
- **[Database Schema](docs/DATABASE.md)** — Tables, relationships, migrations
- **[Background Jobs](docs/BACKGROUND_JOBS.md)** — All 11 scheduled tasks (digests, gap detection, crisis rebuild)
- **[Architecture Deep Dive](docs/ARCHITECTURE.md)** — Design principles, two-pool DB, LLM safety
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** — Common errors and solutions
- **[Setup Guide](docs/SETUP.md)** — Detailed installation and configuration

---

## Development

### Running Tests
```bash
cd Backend
pytest
pytest -k "test_medications"  # Run specific tests
```

### Linting
```bash
# Backend
ruff check app/
ruff format app/

# Frontend
npm run lint
```

### Database Migrations
```bash
# Create new migration
supabase migration new <description>

# Apply migrations
supabase db push
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Follow existing patterns (async/await, type hints, structured logging)
4. Run tests and linting: `pytest && ruff check app/`
5. Submit a pull request

**Code style:**
- Backend: Ruff formatting, type annotations on all functions, async/await throughout
- Frontend: TypeScript strict mode, Tailwind for styling, Radix for UI components
- No inline secrets; all config via environment variables

---

## Acknowledgments

Built as a capstone project for [**100xEngineers**](https://100xengineers.com) — a program for building ambitious products with AI.

**Guided by:** Siddhant Goswami

**Technologies:**
- [Google Gemini](https://ai.google.dev) — Vision OCR, embeddings, LLM
- [Supabase](https://supabase.com) — PostgreSQL, Auth, Storage, Realtime
- [FastAPI](https://fastapi.tiangolo.com) — Python async web framework
- [Next.js](https://nextjs.org) — React framework
- [Sarvam AI](https://sarvam.ai) — Hindi voice transcription
- [Twilio](https://twilio.com) — WhatsApp integration
- [Firebase](https://firebase.google.com) — Push notifications

---

## License

MIT License - see [LICENSE](LICENSE) for details

---

**The care ecosystem is not broken. It was never assembled.  
CareCircle assembles it.**