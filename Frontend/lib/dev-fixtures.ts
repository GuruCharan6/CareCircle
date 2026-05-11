/**
 * DEV ONLY — Mock data for dashboard preview without a backend.
 * Only used when process.env.NODE_ENV === 'development'.
 */

import type {
  UserResponse,
  PatientResponse,
  PatientStateResponse,
  DigestResponse,
  CalendarEventResponse,
} from "./types";

export const DEV_USER: UserResponse = {
  id: "dev-user-001",
  phone_number: "+91 98765 43210",
  email: null,
  auth_provider: "phone",
  name: "Priya Rajan",
  role: "family_caregiver",
  preferences: {},
  created_at: "2024-01-10T06:00:00Z",
  last_login_at: new Date().toISOString(),
};

export const DEV_PATIENT: PatientResponse = {
  id: "dev-patient-001",
  user_id: "dev-user-001",
  name: "Rajan Kumar",
  date_of_birth: "1955-03-15",
  gender: "male",
  blood_type: "O+",
  known_conditions: ["Type 2 Diabetes", "Hypertension", "CKD Stage 2"],
  known_allergies: ["Penicillin", "Sulfa drugs"],
  primary_city: "Chennai",
  emergency_notes: "Allergic to Penicillin. Contact daughter: +91 98765 43210",
  created_at: "2024-01-10T06:00:00Z",
  updated_at: new Date().toISOString(),
};

const DEV_UPCOMING: CalendarEventResponse = {
  id: "dev-event-001",
  patient_id: "dev-patient-001",
  event_type: "appointment",
  title: "Nephrology follow-up",
  specialist_type: "Nephrologist",
  event_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  event_time: "10:30",
  location: "Apollo Hospital, Chennai",
  status: "confirmed",
  source: null,
  required_tests: ["Creatinine", "eGFR", "Urine ACR"],
  tests_status: {},
  is_recurring: false,
  recurrence_pattern: null,
  parent_event_id: null,
  confirmed_by: "dev-user-001",
  notes: "Bring all recent lab reports",
  created_at: "2024-01-12T06:00:00Z",
  updated_at: new Date().toISOString(),
};

export const DEV_PATIENT_STATE: PatientStateResponse = {
  patient_id: "dev-patient-001",
  status: "WATCH",
  active_medication_count: 6,
  pending_document_count: 2,
  unread_notification_count: 3,
  upcoming_appointment: DEV_UPCOMING,
  recent_alerts: [
    "HbA1c elevated at 8.2% — last tested 3 weeks ago",
    "Metformin 500mg refill due in 5 days",
    "Blood pressure log not updated in 7 days",
  ],
  gap_actions: [
    "Schedule nephrology follow-up",
    "Upload latest BP readings",
  ],
  freshness_score: 72,
  computed_at: new Date().toISOString(),
};

export const DEV_DIGEST: DigestResponse = {
  period: "morning",
  generated_at: new Date().toISOString(),
  overall_status: "watch",
  today_summary: "Rajan is stable, but needs a Metformin refill and has elevated HbA1c.",
  known_facts: [
    "Blood pressure is stable this week.",
    "No missed medications reported.",
  ],
  hypotheses: [
    "Elevated HbA1c suggests current Metformin dose may be insufficient.",
    "Recent ankle swelling could be related to Amlodipine.",
  ],
  unknowns: [
    "Has blood pressure been checked today?",
    "Is ankle swelling worse in the evening?",
  ],
  needs_action: "Schedule nephrology follow-up",
  upcoming_events: [
    {
      event_id: "dev-event-001",
      title: "Nephrology follow-up",
      event_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      days_until: 5,
      tests_pending: ["Creatinine", "eGFR", "Urine ACR"],
    }
  ],
  refill_alerts: [
    {
      medication_id: "dev-med-001",
      generic_name: "Metformin",
      brand_name: "Glycomet 500mg",
      days_remaining: 5,
      urgency: "watch",
    }
  ],
  staleness_flags: [
    "Blood pressure log not updated in 7 days"
  ],
  upload_cta_token: null,
};
