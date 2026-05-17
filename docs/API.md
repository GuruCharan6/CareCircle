# API Documentation

CareCircle REST API with 75+ endpoints across 23 route modules.

**Base URL:** `http://localhost:8000/api/v1`  
**Authentication:** Bearer token in `Authorization` header

---

## Table of Contents

- [Authentication](#authentication)
- [Patients](#patients)
- [Documents](#documents)
- [Medications](#medications)
- [Lab Results](#lab-results)
- [Observations](#observations)
- [Caregivers](#caregivers)
- [Calendar](#calendar)
- [Drug Interactions](#drug-interactions)
- [Crisis](#crisis)
- [Chatbot](#chatbot)
- [Notifications](#notifications)
- [Search](#search)
- [Doctor Briefing](#doctor-briefing)
- [Refills](#refills)
- [Prescribers](#prescribers)
- [Webhooks](#webhooks)
- [Health & Metrics](#health--metrics)

---

## Authentication

### Sign Up
```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}

Response 201:
{
  "access_token": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Sign In
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

Response 200:
{
  "access_token": "eyJ...",
  "user": {...}
}
```

### Google OAuth
```http
POST /auth/google
Content-Type: application/json

{
  "credential": "google_oauth_token"
}

Response 200:
{
  "access_token": "eyJ...",
  "user": {...}
}
```

### Refresh Token
```http
POST /auth/refresh
Authorization: Bearer <refresh_token>

Response 200:
{
  "access_token": "new_token"
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>

Response 200:
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "timezone": "Asia/Kolkata"
}
```

---

## Patients

### List Patients
```http
GET /patients
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "uuid",
    "name": "Dad",
    "date_of_birth": "1956-03-15",
    "blood_type": "O+",
    "allergies": ["Penicillin"],
    "emergency_contacts": [...]
  }
]
```

### Create Patient
```http
POST /patients
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Dad",
  "date_of_birth": "1956-03-15",
  "blood_type": "O+",
  "allergies": ["Penicillin"]
}

Response 201:
{
  "id": "uuid",
  "name": "Dad",
  ...
}
```

### Get Patient
```http
GET /patients/{patient_id}
Authorization: Bearer <token>

Response 200:
{
  "id": "uuid",
  "name": "Dad",
  "active_medications_count": 5,
  "last_lab_date": "2024-12-15",
  "upcoming_appointments": 2
}
```

### Update Patient
```http
PATCH /patients/{patient_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "allergies": ["Penicillin", "Sulfa drugs"]
}

Response 200:
{
  "id": "uuid",
  "allergies": ["Penicillin", "Sulfa drugs"]
}
```

### Delete Patient
```http
DELETE /patients/{patient_id}
Authorization: Bearer <token>

Response 204
```

---

## Documents

### List Documents
```http
GET /documents?patient_id={patient_id}&type=prescription&status=complete
Authorization: Bearer <token>

Query params:
- patient_id (required)
- type (optional): prescription, lab_report, doctor_note, voice_note, handwritten_note
- status (optional): pending, review_required, complete, failed

Response 200:
[
  {
    "id": "uuid",
    "type": "prescription",
    "extraction_status": "complete",
    "uploaded_at": "2024-12-01T10:30:00Z",
    "field_confidence": {...}
  }
]
```

### Create Document
```http
POST /documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "type": "prescription",
  "source": "upload"
}

Response 201:
{
  "id": "uuid",
  "type": "prescription",
  "extraction_status": "pending"
}
```

### Get Upload URL
```http
POST /documents/{doc_id}/upload-url
Authorization: Bearer <token>

Response 200:
{
  "upload_url": "https://storage.supabase.co/...",
  "public_url": "https://..."
}
```

### Trigger Extraction
```http
POST /documents/{doc_id}/process
Authorization: Bearer <token>

Response 202:
{
  "message": "Extraction started",
  "task_id": "celery_task_id"
}
```

### Get Extraction Result
```http
GET /documents/{doc_id}/extraction
Authorization: Bearer <token>

Response 200:
{
  "status": "review_required",
  "extracted_data": {
    "medication_name": {
      "value": "Metformin",
      "confidence": 0.95
    },
    "dose": {
      "value": "500",
      "confidence": 0.65
    }
  }
}
```

### Approve Document
```http
POST /documents/{doc_id}/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "extracted_data": {
    "medication_name": "Metformin",
    "dose": "500",
    "frequency": "twice daily"
  }
}

Response 200:
{
  "message": "Pipeline started",
  "task_id": "celery_task_id"
}
```

### Delete Document
```http
DELETE /documents/{doc_id}
Authorization: Bearer <token>

Response 204
```

---

## Medications

### List Medications
```http
GET /medications?patient_id={patient_id}&active_only=true
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "uuid",
    "medication_name": "Metformin",
    "dose": 500,
    "dose_unit": "mg",
    "frequency": "twice daily",
    "route": "oral",
    "status": "active",
    "prescribed_date": "2024-11-01"
  }
]
```

### Get Medication
```http
GET /medications/{med_id}
Authorization: Bearer <token>

Response 200:
{
  "id": "uuid",
  "medication_name": "Metformin",
  "superseded_by": null,
  "prescriber": {
    "name": "Dr. Smith",
    "specialty": "Endocrinology"
  }
}
```

### Update Medication (Discontinue/Supersede)
```http
PATCH /medications/{med_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "discontinued",
  "discontinued_reason": "Side effects"
}

Response 200:
{
  "id": "uuid",
  "status": "discontinued"
}
```

---

## Lab Results

### List Lab Results
```http
GET /lab-results?patient_id={patient_id}&abnormal_only=true
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "uuid",
    "test_name": "HbA1c",
    "value": 9.2,
    "unit": "%",
    "reference_range": "4.0 - 5.6",
    "is_abnormal": true,
    "delta_from_prev": 0.7,
    "collected_date": "2024-12-15"
  }
]
```

### Get Lab Result
```http
GET /lab-results/{result_id}
Authorization: Bearer <token>

Response 200:
{
  "id": "uuid",
  "test_name": "HbA1c",
  "prev_reading_id": "uuid",
  "trend": "worsening"
}
```

---

## Observations

### List Observations
```http
GET /observations?patient_id={patient_id}&type=symptom&days=7
Authorization: Bearer <token>

Query params:
- patient_id (required)
- type (optional): symptom, meal, medication, mood, vital
- days (optional): filter last N days

Response 200:
[
  {
    "id": "uuid",
    "type": "symptom",
    "observation_data": {
      "symptom": "dizziness",
      "severity": "moderate",
      "duration_minutes": 30
    },
    "source": "caregiver",
    "observed_at": "2024-12-20T08:00:00Z"
  }
]
```

### Create Observation
```http
POST /observations
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "type": "symptom",
  "observation_data": {
    "symptom": "chest pain",
    "severity": "severe"
  },
  "source": "patient"
}

Response 201:
{
  "id": "uuid",
  "type": "symptom",
  ...
}
```

---

## Caregivers

### List Caregivers
```http
GET /caregivers?patient_id={patient_id}
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "uuid",
    "name": "Nurse Mary",
    "phone": "+919876543210",
    "status": "active",
    "visit_schedule": {
      "monday": ["09:00", "17:00"],
      "wednesday": ["09:00", "17:00"]
    }
  }
]
```

### Invite Caregiver
```http
POST /caregivers/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "phone": "+919876543210",
  "name": "Nurse Mary"
}

Response 201:
{
  "id": "uuid",
  "invitation_status": "pending"
}
```

### Update Caregiver Schedule
```http
PATCH /caregivers/{caregiver_id}/schedule
Authorization: Bearer <token>
Content-Type: application/json

{
  "visit_schedule": {
    "monday": ["09:00", "13:00", "17:00"],
    "friday": ["09:00"]
  }
}

Response 200:
{
  "id": "uuid",
  "visit_schedule": {...}
}
```

---

## Calendar

### List Events
```http
GET /calendar?patient_id={patient_id}&upcoming=true
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "uuid",
    "title": "Cardiology Follow-up",
    "event_date": "2024-12-25T10:00:00Z",
    "event_type": "appointment",
    "status": "confirmed",
    "metadata": {
      "doctor": "Dr. Patel",
      "location": "Apollo Hospital"
    }
  }
]
```

### Create Event
```http
POST /calendar
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "title": "HbA1c Test",
  "event_date": "2024-12-23T09:00:00Z",
  "event_type": "lab_test"
}

Response 201:
{
  "id": "uuid",
  "title": "HbA1c Test",
  ...
}
```

### Confirm Suggested Event
```http
POST /calendar/{event_id}/confirm
Authorization: Bearer <token>

Response 200:
{
  "id": "uuid",
  "status": "confirmed"
}
```

---

## Drug Interactions

### Check Interactions
```http
POST /drug-interactions/check
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "medications": ["Metformin", "Glibenclamide"]
}

Response 200:
[
  {
    "drug_a": "Metformin",
    "drug_b": "Glibenclamide",
    "severity": "major",
    "urgency": "alert",
    "mechanism": "Increased risk of hypoglycemia",
    "lab_modifier_applied": false
  }
]
```

### Get Interaction History
```http
GET /drug-interactions?patient_id={patient_id}&urgency=alert
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "uuid",
    "drug_a": "Metformin",
    "drug_b": "Lisinopril",
    "severity": "major",
    "urgency": "alert",
    "lab_modifier_applied": true,
    "lab_values_at_check": {
      "creatinine": 1.8
    },
    "checked_at": "2024-12-20T10:00:00Z"
  }
]
```

---

## Crisis

### Get Crisis Card
```http
GET /patients/{patient_id}/crisis
Authorization: Bearer <token>

Response 200:
{
  "patient": {
    "name": "Dad",
    "date_of_birth": "1956-03-15",
    "blood_type": "O+"
  },
  "active_medications": [
    {
      "name": "Metformin",
      "dose": "500mg",
      "frequency": "twice daily"
    }
  ],
  "allergies": ["Penicillin"],
  "emergency_contacts": [...],
  "active_alerts": [
    "HbA1c elevated and worsening"
  ],
  "nearest_hospital": "Apollo Hospital (2.3 km)",
  "last_updated": "2024-12-20T02:00:00Z"
}
```

### Generate Crisis PDF
```http
POST /patients/{patient_id}/crisis/pdf
Authorization: Bearer <token>

Response 200:
{
  "pdf_url": "https://storage.supabase.co/.../crisis_card.pdf",
  "expires_at": "2024-12-21T10:00:00Z"
}
```

### Trigger Manual Rebuild
```http
POST /patients/{patient_id}/crisis/rebuild
Authorization: Bearer <token>

Response 202:
{
  "message": "Crisis packet rebuild started",
  "task_id": "celery_task_id"
}
```

---

## Chatbot

### Send Message
```http
POST /chatbot/message
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "message": "What tests does Dad need before his cardiology appointment?"
}

Response 200:
{
  "response": "Based on the upcoming cardiology appointment on Dec 25, the following tests are recommended: ECG, Lipid Panel, Creatinine. The ECG has not been scheduled yet.",
  "tools_used": ["gap_detection", "calendar_lookup"]
}
```

### Get Chat History
```http
GET /chatbot/history?patient_id={patient_id}&limit=50
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "uuid",
    "message": "What medications is Dad taking?",
    "response": "Dad is currently on 5 active medications: ...",
    "timestamp": "2024-12-20T09:00:00Z"
  }
]
```

---

## Notifications

### List Notifications
```http
GET /notifications?patient_id={patient_id}&unread_only=true
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "uuid",
    "title": "Drug Interaction Alert",
    "body": "Major interaction detected: Metformin + Lisinopril",
    "urgency": "alert",
    "channel": "in_app",
    "is_read": false,
    "created_at": "2024-12-20T10:00:00Z",
    "linked_entity_type": "drug_interaction",
    "linked_entity_id": "uuid"
  }
]
```

### Mark as Read
```http
PATCH /notifications/{notification_id}/read
Authorization: Bearer <token>

Response 200:
{
  "id": "uuid",
  "is_read": true
}
```

---

## Search

### Hybrid Search
```http
POST /search
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "query": "when was the last HbA1c test",
  "limit": 5
}

Response 200:
{
  "results": [
    {
      "type": "lab_result",
      "id": "uuid",
      "relevance_score": 0.95,
      "content": "HbA1c: 9.2% on 2024-12-15"
    }
  ]
}
```

---

## Doctor Briefing

### Generate Briefing
```http
POST /doctor-briefing
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "appointment_id": "uuid"
}

Response 200:
{
  "briefing_text": "Patient: Dad (67M)\n\nActive Medications: ...\n\nRecent Labs: ...\n\nActive Alerts: ...",
  "pdf_url": "https://storage.supabase.co/.../briefing.pdf"
}
```

---

## Refills

### List Refills
```http
GET /refills?patient_id={patient_id}&status=due
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "uuid",
    "medication_id": "uuid",
    "medication_name": "Metformin",
    "supply_days": 30,
    "last_refill_date": "2024-11-20",
    "next_refill_due": "2024-12-20",
    "status": "due",
    "reminder_sent_at": "2024-12-10T08:00:00Z"
  }
]
```

### Log Refill
```http
POST /refills/{refill_id}/log
Authorization: Bearer <token>
Content-Type: application/json

{
  "refill_date": "2024-12-20",
  "supply_days": 30,
  "supply_source": "pharmacy"
}

Response 200:
{
  "id": "uuid",
  "next_refill_due": "2025-01-19"
}
```

---

## Prescribers

### List Prescribers
```http
GET /prescribers?patient_id={patient_id}
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "uuid",
    "name": "Dr. Smith",
    "specialty": "Endocrinology",
    "hospital": "Apollo Hospital",
    "phone": "+919876543210"
  }
]
```

### Create Prescriber
```http
POST /prescribers
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "name": "Dr. Patel",
  "specialty": "Cardiology",
  "hospital": "Max Hospital"
}

Response 201:
{
  "id": "uuid",
  "name": "Dr. Patel",
  ...
}
```

---

## Webhooks

### Twilio WhatsApp Webhook
```http
POST /webhooks/whatsapp
Content-Type: application/x-www-form-urlencoded

From=whatsapp:+919876543210
Body=Dad took his morning medications
MediaUrl0=https://...

Response 200:
<Response>
  <Message>Observation logged. Thanks!</Message>
</Response>
```

**Note:** This endpoint uses Twilio signature verification. Not authenticated with Bearer token.

---

## Health & Metrics

### Health Check
```http
GET /health

Response 200:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "celery": "running"
}
```

### Prometheus Metrics
```http
GET /metrics

Response 200:
# HELP pipeline_layer_duration_seconds Pipeline layer execution time
# TYPE pipeline_layer_duration_seconds histogram
pipeline_layer_duration_seconds_bucket{layer="layer1",le="5.0"} 120
...
```

---

## Error Responses

All errors return structured JSON:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Patient not found",
    "details": {
      "patient_id": "invalid-uuid"
    }
  }
}
```

**Common error codes:**
- `401` → `UNAUTHORIZED` — Invalid or expired token
- `403` → `FORBIDDEN` — Insufficient permissions
- `404` → `NOT_FOUND` — Resource doesn't exist
- `409` → `CONFLICT` — Resource already exists or state conflict
- `422` → `VALIDATION_ERROR` — Invalid request body
- `500` → `INTERNAL_ERROR` — Server error

---

## Rate Limiting

- **General endpoints:** 100 requests/minute per user
- **LLM-dependent endpoints** (chatbot, search, extraction): 20 requests/minute per user
- **WhatsApp webhook:** No rate limit (external service)

Rate limit headers included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703088000
```