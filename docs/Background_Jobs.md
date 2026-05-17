# Background Jobs

CareCircle uses Celery + Redis for distributed task scheduling. 11 jobs run on various schedules to keep patient data fresh, send proactive alerts, and pre-compute crisis information.

---

## Job Architecture

**Task Queue:** Celery 5.6 with Redis broker  
**Scheduler:** Celery Beat for cron-style scheduling  
**Timezone:** All schedules in IST (Asia/Kolkata)  
**Retry Policy:** 3 attempts with exponential backoff (2^retry_count seconds)

**Worker command:**
```bash
celery -A app.worker.celery_app worker --loglevel=info
```

**Beat command:**
```bash
celery -A app.worker.celery_app beat --loglevel=info
```

---

## All Jobs Overview

| Job | Schedule (IST) | Purpose | Avg Runtime |
|-----|----------------|---------|-------------|
| morning_digest | 7:00 AM daily | Send daily summary WhatsApp message | ~5s per patient |
| evening_digest | 9:30 PM daily | Send evening caregiver summary | ~4s per patient |
| nightly_crisis_rebuild | 2:00 AM daily | Pre-compute crisis packets → Redis | ~8s per patient |
| daily_gap_detection | 6:00 AM daily | Scan for missing pre-visit tests | ~3s per patient |
| refill_escalation | 6:30 AM daily | Progressive medication refill reminders | ~2s per patient |
| caregiver_visit_messages | 8:00 AM daily | Pre-visit reminders to caregivers | ~1s per caregiver |
| deviation_check | 12:00 PM daily | Escalate if ≥3 simultaneous alert hypotheses | ~2s per patient |
| staleness_check | 8:00 PM daily | Rebuild patient_state freshness scores | ~1s per patient |
| caregiver_silence_detector | 7:00 PM daily | Alert if caregiver silent ≥3 days | ~1s per patient |
| caregiver_monthly_check | 1st of month, 10:00 AM | Re-engagement check for inactive caregivers | ~1s per caregiver |
| calendar_reminders | T-2 days, 8:00 AM | Appointment reminders | ~1s per event |

---

## Job Details

### 1. morning_digest

**File:** `Backend/app/worker/jobs/morning_digest.py`  
**Schedule:** Every day at 7:00 AM IST  
**Purpose:** Send WhatsApp digest with active alerts, upcoming appointments, and due refills

**What it does:**
1. For each patient with WhatsApp enabled:
   - Fetches active alert-level clinical hypotheses
   - Fetches appointments in next 7 days
   - Fetches medication refills due in next 10 days
2. Formats digest message
3. Sends via Twilio WhatsApp API
4. Logs message to `whatsapp_messages` table

**Message format:**
```
🌅 Good Morning!

🚨 Alerts (2):
• HbA1c elevated and worsening (9.2%)
• Drug interaction: Metformin + Lisinopril

📅 Upcoming (1):
• Cardiology Follow-up - Dec 25, 10:00 AM

💊 Refills Due (1):
• Metformin - due in 5 days

Reply with updates or questions anytime.
```

**Skips if:**
- No alerts, no upcoming appointments, no due refills
- Patient has opted out of morning digest
- Last digest sent <12 hours ago (prevents spam on retry)

---

### 2. evening_digest

**File:** `Backend/app/worker/jobs/evening_digest.py`  
**Schedule:** Every day at 9:30 PM IST  
**Purpose:** Send caregiver activity summary and new hypotheses

**What it does:**
1. For each patient:
   - Counts caregiver observations logged today
   - Fetches new watch/inform-level hypotheses created today
   - Checks medication adherence (missed doses)
2. Formats evening summary
3. Sends via WhatsApp

**Message format:**
```
🌙 Evening Summary

✅ Today's Activity:
• 3 observations logged by caregiver
• All medications taken on time

📊 New Insights:
• Fasting glucose slightly elevated (125 mg/dL)

💤 Rest well. See you tomorrow.
```

**Skips if:**
- Zero activity today (no observations, no new hypotheses, perfect adherence)

---

### 3. nightly_crisis_rebuild

**File:** `Backend/app/worker/jobs/nightly_crisis_rebuild.py`  
**Schedule:** Every day at 2:00 AM IST  
**Purpose:** Pre-compute crisis packets and cache in Redis

**What it does:**
1. For each patient:
   - Fetches all active medications with doses, frequencies, prescribers
   - Fetches allergies, blood type, emergency contacts
   - Fetches active alert-level clinical hypotheses
   - Fetches recent abnormal labs
   - Calculates nearest hospital (based on patient address if available)
2. Builds crisis packet JSON
3. Stores in `crisis_packets` table
4. Stores in Redis with 1-hour TTL, key: `crisis:patient:{patient_id}`

**Why 2:00 AM:**
- Low user activity → minimal DB load impact
- Ensures fresh data for next day's emergencies
- 1-hour TTL means packet expires at 3:00 AM, but GET endpoint falls back to DB

**Crisis packet structure:**
```json
{
  "patient": {
    "name": "Dad",
    "date_of_birth": "1956-03-15",
    "blood_type": "O+",
    "age": 67
  },
  "active_medications": [
    {
      "name": "Metformin",
      "dose": "500mg",
      "frequency": "twice daily",
      "prescriber": "Dr. Smith, Endocrinology"
    }
  ],
  "allergies": ["Penicillin"],
  "emergency_contacts": [
    {
      "name": "Son - Rahul",
      "phone": "+919876543210",
      "relationship": "son"
    }
  ],
  "active_alerts": [
    "HbA1c elevated at 9.2% and worsening",
    "Drug interaction: Metformin + Lisinopril (major)"
  ],
  "recent_abnormal_labs": [
    {
      "test": "Creatinine",
      "value": "1.8 mg/dL",
      "date": "2024-12-15"
    }
  ],
  "nearest_hospital": "Apollo Hospital (2.3 km)",
  "last_updated": "2024-12-20T02:00:00Z"
}
```

---

### 4. daily_gap_detection

**File:** `Backend/app/worker/jobs/daily_gap_detection.py`  
**Schedule:** Every day at 6:00 AM IST  
**Purpose:** Detect missing pre-visit tests before appointments

**What it does:**
1. Fetches all confirmed appointments in next 14 days
2. For each appointment:
   - Determines appointment type (cardiology, endocrinology, etc.)
   - Looks up required pre-visit tests (HbA1c before endo, ECG before cardio, etc.)
   - Checks if required tests have been scheduled or completed
3. Creates `gap_actions` for missing tests
4. Sends WhatsApp notification if gap created ≤7 days before appointment

**Example gap detection:**
```
Appointment: Cardiology follow-up on Dec 25
Required tests: ECG, Lipid Panel, Creatinine
Missing: ECG (not scheduled)
→ Creates gap_action with required_by = Dec 23 (2 days before appointment)
→ Sends WhatsApp: "⚠️ Missing test for upcoming cardiology appointment: ECG needed by Dec 23"
```

**Test requirements (configurable):**
- Cardiology → ECG, Lipid Panel, Creatinine
- Endocrinology → HbA1c, Fasting Glucose, Creatinine
- Nephrology → Creatinine, eGFR, Urinalysis
- General checkup → CBC, Lipid Panel

---

### 5. refill_escalation

**File:** `Backend/app/worker/jobs/refill_escalation.py`  
**Schedule:** Every day at 6:30 AM IST  
**Purpose:** Progressive medication refill reminders

**What it does:**
1. Fetches all medication refills
2. For each refill:
   - **T-10 days:** First reminder (if `reminder_t10_sent_at` is NULL)
   - **T-3 days:** Escalation reminder (if `reminder_t3_sent_at` is NULL)
   - **T-0 days (due today):** Final alert (if `reminder_t0_sent_at` is NULL)
3. Sends WhatsApp message
4. Updates `reminder_tX_sent_at` timestamp

**Reminder messages:**
```
T-10: "📦 Medication refill due in 10 days: Metformin (500mg). Schedule pickup soon."
T-3:  "⚠️ Medication refill due in 3 days: Metformin (500mg). Please arrange refill."
T-0:  "🚨 URGENT: Metformin refill due TODAY. Supply runs out tonight."
```

**Supply source tracking:**
- Refill marked with `supply_source` (pharmacy, caregiver, voice_nlu, default)
- If source = "voice_nlu" → extracted from caregiver voice note ("picked up meds from pharmacy")

---

### 6. caregiver_visit_messages

**File:** `Backend/app/worker/jobs/caregiver_visit_messages.py`  
**Schedule:** Every day at 8:00 AM IST  
**Purpose:** Send pre-visit reminders to caregivers

**What it does:**
1. Fetches all caregivers with active status
2. For each caregiver, checks today's `visit_schedule`
3. If caregiver has a visit today, sends WhatsApp reminder with:
   - Scheduled visit time
   - Patient name
   - Any special notes for today (new medications, appointments, etc.)

**Message format:**
```
👋 Good morning! You have a visit scheduled today:

👤 Patient: Dad
🕐 Time: 9:00 AM

📝 Notes:
• New medication started: Lisinopril 10mg (once daily, morning)
• Cardiology appointment tomorrow at 10 AM

Safe travels!
```

**Skips if:**
- Caregiver opted out
- No visit scheduled for today

---

### 7. deviation_check

**File:** `Backend/app/worker/jobs/deviation_check.py`  
**Schedule:** Every day at 12:00 PM IST  
**Purpose:** Escalate if patient has ≥3 simultaneous alert-level hypotheses

**What it does:**
1. For each patient:
   - Counts active alert-level clinical hypotheses
2. If count ≥ 3:
   - Creates in-app notification (urgency: alert)
   - Sends WhatsApp message: "🚨 Multiple health alerts detected. Please review dashboard."
   - Sends push notification
3. Marks hypotheses as "escalated"

**Why this matters:**
- Single alert → watch and monitor
- Multiple simultaneous alerts → potential crisis, needs immediate attention
- Threshold of 3 balances sensitivity vs alarm fatigue

---

### 8. staleness_check

**File:** `Backend/app/worker/jobs/staleness_check.py`  
**Schedule:** Every day at 8:00 PM IST  
**Purpose:** Rebuild patient_state freshness scores

**What it does:**
1. For each patient, for each health dimension (biochemical, behavioral, subjective, clinical):
   - Calculates time since last update
   - Computes freshness score: `1.0 / (1 + days_since_update)`
   - Updates `patient_state` table
2. Writes to Redis cache (5 min TTL)

**Freshness score decay:**
```
0 days → 1.0 (perfectly fresh)
1 day  → 0.5 (moderately fresh)
3 days → 0.25 (stale)
7 days → 0.125 (very stale)
```

**Frontend usage:**
Dashboard shows freshness indicators:
- 🟢 Green: >0.7 (fresh)
- 🟡 Yellow: 0.3-0.7 (aging)
- 🔴 Red: <0.3 (stale)

---

### 9. caregiver_silence_detector

**File:** `Backend/app/worker/jobs/caregiver_silence_detector.py`  
**Schedule:** Every day at 7:00 PM IST  
**Purpose:** Alert if caregiver hasn't logged observations in ≥3 days

**What it does:**
1. For each active caregiver:
   - Checks `last_visit_logged` timestamp
   - If ≥3 days ago → creates alert
2. Sends WhatsApp to family: "⚠️ Caregiver [name] hasn't logged updates in 3 days. Please check in."
3. Sends WhatsApp to caregiver: "👋 We haven't heard from you in a while. Everything okay?"

**Why this matters:**
- Caregiver silence might mean:
  - They forgot to log observations
  - They stopped visiting
  - Something happened to the patient
- Early detection prevents information gaps

---

### 10. caregiver_monthly_check

**File:** `Backend/app/worker/jobs/caregiver_monthly_check.py`  
**Schedule:** 1st of every month at 10:00 AM IST  
**Purpose:** Re-engage inactive caregivers

**What it does:**
1. Fetches caregivers with status = "inactive" and last activity >30 days
2. Sends WhatsApp: "👋 Hi [name], we haven't seen you in a while. Are you still caring for [patient]? Reply YES to reactivate."
3. If reply = "YES" within 7 days → status = "active"
4. If no reply → status remains "inactive"

**Why monthly:**
- Caregivers might take breaks (illness, vacation, family emergency)
- Monthly check gives chance to reconnect without being pushy

---

### 11. calendar_reminders

**File:** `Backend/app/worker/jobs/calendar_reminders.py`  
**Schedule:** Every day at 8:00 AM IST  
**Purpose:** Send appointment reminders T-2 days before event

**What it does:**
1. Fetches calendar events where:
   - `event_date` is exactly 2 days from now
   - `status` = "confirmed"
   - Reminder not yet sent
2. Sends WhatsApp: "📅 Reminder: Cardiology appointment in 2 days (Dec 25, 10:00 AM at Apollo Hospital)"
3. Marks event as `reminder_sent = true`

**Why T-2 days:**
- Enough time to arrange transportation, caregiver coverage
- Not too early (people forget)
- Not too late (no time to prepare)

---

## Monitoring & Observability

All jobs emit Prometheus metrics:

- `celery_task_duration_seconds` — Histogram per job
- `celery_task_failures_total` — Counter with job label
- `celery_task_success_total` — Counter with job label
- `celery_queue_length` — Gauge (pending tasks in Redis)

**Grafana dashboards:**
- Job execution times (p50, p95, p99)
- Failure rates by job
- Queue depth over time
- Retry patterns

**Structlog entries:**
```json
{
  "event": "morning_digest_sent",
  "patient_id": "uuid",
  "alerts_count": 2,
  "appointments_count": 1,
  "whatsapp_sid": "SM...",
  "duration_ms": 4523
}
```

---

## Error Handling

**Retry policy:** All jobs retry 3x with exponential backoff (2, 4, 8 seconds)

**Common failures:**
- **Twilio API error** (rate limit, invalid number) → Log error, skip patient, don't retry
- **Database timeout** → Retry 3x
- **Redis connection error** → Fallback to DB, retry job
- **Gemini API error** (quota exceeded) → Log error, skip patient, alert admin

**Dead letter queue:**
After 3 failures, task moves to `failed_tasks` table with error details for manual review.

---

## Scaling Considerations

**Current setup:** Single worker process, single beat scheduler

**For production scale (10k+ patients):**
1. **Horizontal worker scaling:** 3-5 worker processes across multiple servers
2. **Task routing:** Separate queues for high-priority (crisis rebuild) vs low-priority (monthly check)
3. **Rate limiting:** Twilio WhatsApp limited to 1000 messages/hour → batch processing with delays
4. **Database connection pooling:** Each worker gets dedicated pool (max 10 connections)

**Estimated capacity:**
- Single worker: ~500 patients (all jobs combined)
- 5 workers: ~2,500 patients
- Bottleneck: Twilio API rate limits, not worker CPU