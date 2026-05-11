/**
 * DEV ONLY — Mock API interceptor.
 * Intercepts all api.get/post/etc calls in development so every page renders
 * with realistic data without a running backend.
 */

import type {
  PatientResponse,
  MedicationResponse,
  LabResultResponse,
  ObservationResponse,
  DocumentListItem,
  DocumentResponse,
  CalendarEventResponse,
  RefillStatusResponse,
  CaregiverResponse,
  NotificationResponse,
  DrugInteractionResponse,
  CrisisPacketResponse,
  PatientStateResponse,
  DigestResponse,
  ChatResponse,
  SuggestedPrompt,
  SearchResponse,
} from "@/lib/types";

const P = "dev-patient-001";
const U = "dev-user-001";
const NOW = () => new Date().toISOString();
const DAYS = (n: number) => new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);

// ── Medications ───────────────────────────────────────────────────────────────

const MEDICATIONS: MedicationResponse[] = [
  {
    id: "dev-med-001", patient_id: P, source_document_id: "dev-doc-001",
    generic_name: "Metformin", brand_name: "Glycomet", drug_class: "Biguanide",
    dose: "500mg", frequency: "Twice daily", timing: "After meals",
    timing_slots: [{ time: "08:30", label: "After breakfast" }, { time: "20:30", label: "After dinner" }],
    prescriber_id: "dev-dr-001", prescriber_name: "Dr. Suresh Iyer",
    prescriber_specialty: "Diabetologist", prescriber_hospital: "Apollo Hospital",
    prescribed_date: "2024-06-01", valid_from: "2024-06-01", valid_until: null,
    status: "active", superseded_by: null, body_systems: ["Endocrine"],
    notes: "Monitor renal function quarterly", created_at: "2024-06-01T06:00:00Z",
  },
  {
    id: "dev-med-002", patient_id: P, source_document_id: "dev-doc-001",
    generic_name: "Amlodipine", brand_name: "Amlokind", drug_class: "Calcium channel blocker",
    dose: "5mg", frequency: "Once daily", timing: "Morning",
    timing_slots: [{ time: "08:00", label: "Morning" }],
    prescriber_id: "dev-dr-002", prescriber_name: "Dr. Meena Krishnan",
    prescriber_specialty: "Cardiologist", prescriber_hospital: "Fortis Malar",
    prescribed_date: "2024-03-15", valid_from: "2024-03-15", valid_until: null,
    status: "active", superseded_by: null, body_systems: ["Cardiovascular"],
    notes: null, created_at: "2024-03-15T06:00:00Z",
  },
  {
    id: "dev-med-003", patient_id: P, source_document_id: null,
    generic_name: "Telmisartan", brand_name: "Telma", drug_class: "ARB",
    dose: "40mg", frequency: "Once daily", timing: "Morning",
    timing_slots: [{ time: "08:00", label: "Morning" }],
    prescriber_id: "dev-dr-002", prescriber_name: "Dr. Meena Krishnan",
    prescriber_specialty: "Cardiologist", prescriber_hospital: "Fortis Malar",
    prescribed_date: "2024-03-15", valid_from: "2024-03-15", valid_until: null,
    status: "active", superseded_by: null, body_systems: ["Cardiovascular", "Renal"],
    notes: "Avoid NSAIDs", created_at: "2024-03-15T06:00:00Z",
  },
  {
    id: "dev-med-004", patient_id: P, source_document_id: null,
    generic_name: "Atorvastatin", brand_name: "Atorva", drug_class: "Statin",
    dose: "10mg", frequency: "Once daily", timing: "Night",
    timing_slots: [{ time: "21:00", label: "After dinner" }],
    prescriber_id: "dev-dr-001", prescriber_name: "Dr. Suresh Iyer",
    prescriber_specialty: "Diabetologist", prescriber_hospital: "Apollo Hospital",
    prescribed_date: "2024-06-01", valid_from: "2024-06-01", valid_until: null,
    status: "active", superseded_by: null, body_systems: ["Cardiovascular"],
    notes: null, created_at: "2024-06-01T06:00:00Z",
  },
  {
    id: "dev-med-005", patient_id: P, source_document_id: null,
    generic_name: "Pantoprazole", brand_name: "Pan-D", drug_class: "PPI",
    dose: "40mg", frequency: "Once daily", timing: "Before breakfast",
    timing_slots: [{ time: "07:30", label: "Before breakfast" }],
    prescriber_id: "dev-dr-001", prescriber_name: "Dr. Suresh Iyer",
    prescriber_specialty: "Diabetologist", prescriber_hospital: "Apollo Hospital",
    prescribed_date: "2024-06-01", valid_from: "2024-06-01", valid_until: null,
    status: "active", superseded_by: null, body_systems: ["Gastrointestinal"],
    notes: null, created_at: "2024-06-01T06:00:00Z",
  },
  {
    id: "dev-med-006", patient_id: P, source_document_id: "dev-doc-002",
    generic_name: "Furosemide", brand_name: "Lasix", drug_class: "Loop diuretic",
    dose: "20mg", frequency: "Once daily", timing: "Morning",
    timing_slots: [{ time: "08:00", label: "Morning" }],
    prescriber_id: "dev-dr-003", prescriber_name: "Dr. Anand Nair",
    prescriber_specialty: "Nephrologist", prescriber_hospital: "Apollo Hospital",
    prescribed_date: "2025-01-10", valid_from: "2025-01-10", valid_until: null,
    status: "active", superseded_by: null, body_systems: ["Renal", "Cardiovascular"],
    notes: "Monitor electrolytes", created_at: "2025-01-10T06:00:00Z",
  },
  {
    id: "dev-med-007", patient_id: P, source_document_id: null,
    generic_name: "Glibenclamide", brand_name: "Daonil", drug_class: "Sulfonylurea",
    dose: "5mg", frequency: "Once daily", timing: "Before breakfast",
    timing_slots: [{ time: "07:30", label: "Before breakfast" }],
    prescriber_id: "dev-dr-001", prescriber_name: "Dr. Suresh Iyer",
    prescriber_specialty: "Diabetologist", prescriber_hospital: "Apollo Hospital",
    prescribed_date: "2023-09-01", valid_from: "2023-09-01", valid_until: "2024-06-01",
    status: "discontinued", superseded_by: "dev-med-001", body_systems: ["Endocrine"],
    notes: "Switched to Metformin due to hypoglycemia episodes",
    created_at: "2023-09-01T06:00:00Z",
  },
];

// ── Lab Results ───────────────────────────────────────────────────────────────

const LAB_RESULTS: LabResultResponse[] = [
  {
    id: "dev-lab-001", patient_id: P, source_document_id: "dev-doc-003",
    test_name: "hba1c", test_name_display: "HbA1c",
    value: 8.2, unit: "%", reference_range_low: 4.0, reference_range_high: 5.7,
    is_abnormal: true, specialist_type: "Diabetologist", lab_name: "SRL Diagnostics",
    test_date: DAYS(-21), delta_from_prev: 0.3, rate_of_change: null,
    prev_reading_id: "dev-lab-008", prev_reading_date: DAYS(-90),
    created_at: DAYS(-21) + "T08:00:00Z",
  },
  {
    id: "dev-lab-002", patient_id: P, source_document_id: "dev-doc-003",
    test_name: "creatinine", test_name_display: "Creatinine",
    value: 1.4, unit: "mg/dL", reference_range_low: 0.7, reference_range_high: 1.2,
    is_abnormal: true, specialist_type: "Nephrologist", lab_name: "SRL Diagnostics",
    test_date: DAYS(-21), delta_from_prev: 0.1, rate_of_change: null,
    prev_reading_id: "dev-lab-009", prev_reading_date: DAYS(-90),
    created_at: DAYS(-21) + "T08:00:00Z",
  },
  {
    id: "dev-lab-003", patient_id: P, source_document_id: "dev-doc-003",
    test_name: "egfr", test_name_display: "eGFR",
    value: 62, unit: "mL/min/1.73m²", reference_range_low: 60, reference_range_high: 120,
    is_abnormal: false, specialist_type: "Nephrologist", lab_name: "SRL Diagnostics",
    test_date: DAYS(-21), delta_from_prev: -3, rate_of_change: null,
    prev_reading_id: "dev-lab-010", prev_reading_date: DAYS(-90),
    created_at: DAYS(-21) + "T08:00:00Z",
  },
  {
    id: "dev-lab-004", patient_id: P, source_document_id: "dev-doc-003",
    test_name: "bp_systolic", test_name_display: "Blood Pressure (Systolic)",
    value: 138, unit: "mmHg", reference_range_low: 90, reference_range_high: 120,
    is_abnormal: true, specialist_type: "Cardiologist", lab_name: null,
    test_date: DAYS(-7), delta_from_prev: -4, rate_of_change: null,
    prev_reading_id: null, prev_reading_date: null,
    created_at: DAYS(-7) + "T09:00:00Z",
  },
  {
    id: "dev-lab-005", patient_id: P, source_document_id: "dev-doc-003",
    test_name: "cholesterol_total", test_name_display: "Total Cholesterol",
    value: 185, unit: "mg/dL", reference_range_low: null, reference_range_high: 200,
    is_abnormal: false, specialist_type: null, lab_name: "SRL Diagnostics",
    test_date: DAYS(-21), delta_from_prev: -10, rate_of_change: null,
    prev_reading_id: null, prev_reading_date: null,
    created_at: DAYS(-21) + "T08:00:00Z",
  },
  {
    id: "dev-lab-006", patient_id: P, source_document_id: "dev-doc-003",
    test_name: "potassium", test_name_display: "Potassium",
    value: 4.2, unit: "mEq/L", reference_range_low: 3.5, reference_range_high: 5.0,
    is_abnormal: false, specialist_type: "Nephrologist", lab_name: "SRL Diagnostics",
    test_date: DAYS(-21), delta_from_prev: 0.1, rate_of_change: null,
    prev_reading_id: null, prev_reading_date: null,
    created_at: DAYS(-21) + "T08:00:00Z",
  },
];

// ── Observations ──────────────────────────────────────────────────────────────

const OBSERVATIONS: ObservationResponse[] = [
  {
    id: "dev-obs-001", patient_id: P, source_document_id: null,
    source_type: "manual_entry", caregiver_id: null,
    observation_date: DAYS(-1),
    symptoms_reported: ["mild fatigue", "ankle swelling"],
    symptoms_denied: ["chest pain", "breathlessness"],
    symptoms_absent: [],
    meals_eaten: { breakfast: "idli sambar", lunch: "rice dal", dinner: "chapati sabzi" },
    meal_notes: "Good appetite today",
    medications_taken: true, medication_timing_notes: "All on time",
    mobility_notes: "Short walk in the morning, about 15 minutes",
    mood: "calm", energy_level: "moderate",
    meera_mood_read: "Patient seems relaxed, no distress signals",
    concerns_flagged: ["ankle swelling persists"],
    raw_transcript: null,
    created_at: DAYS(-1) + "T20:00:00Z",
  },
  {
    id: "dev-obs-002", patient_id: P, source_document_id: null,
    source_type: "caregiver_note", caregiver_id: "dev-cg-001",
    observation_date: DAYS(-2),
    symptoms_reported: [],
    symptoms_denied: [],
    symptoms_absent: ["fever", "vomiting"],
    meals_eaten: { breakfast: "cornflakes milk", lunch: "curd rice" },
    meal_notes: "Ate less than usual at dinner",
    medications_taken: true, medication_timing_notes: "Metformin slightly late (after 9am)",
    mobility_notes: "Stayed home, no outdoor activity",
    mood: "slightly irritable", energy_level: "low",
    meera_mood_read: null,
    concerns_flagged: [],
    raw_transcript: null,
    created_at: DAYS(-2) + "T19:30:00Z",
  },
  {
    id: "dev-obs-003", patient_id: P, source_document_id: null,
    source_type: "voice_note", caregiver_id: null,
    observation_date: DAYS(-3),
    symptoms_reported: ["back pain"],
    symptoms_denied: [],
    symptoms_absent: [],
    meals_eaten: {},
    meal_notes: null,
    medications_taken: true, medication_timing_notes: null,
    mobility_notes: null,
    mood: null, energy_level: null,
    meera_mood_read: "Mentions back pain, flagged for review",
    concerns_flagged: ["back pain — new complaint"],
    raw_transcript: "He said his back has been hurting since yesterday, probably from sitting too long",
    created_at: DAYS(-3) + "T11:00:00Z",
  },
];

// ── Documents ─────────────────────────────────────────────────────────────────

const DOCUMENTS: DocumentListItem[] = [
  {
    id: "dev-doc-001", document_type: "prescription",
    ingestion_source: "app_upload", extraction_status: "approved",
    event_date: "2024-06-01", created_at: "2024-06-01T07:00:00Z",
  },
  {
    id: "dev-doc-002", document_type: "prescription",
    ingestion_source: "app_upload", extraction_status: "approved",
    event_date: "2025-01-10", created_at: "2025-01-10T07:00:00Z",
  },
  {
    id: "dev-doc-003", document_type: "lab_report",
    ingestion_source: "camera", extraction_status: "approved",
    event_date: DAYS(-21), created_at: DAYS(-21) + "T08:30:00Z",
  },
  {
    id: "dev-doc-004", document_type: "lab_report",
    ingestion_source: "app_upload", extraction_status: "review_required",
    event_date: DAYS(-5), created_at: DAYS(-5) + "T10:00:00Z",
  },
  {
    id: "dev-doc-005", document_type: "doctor_note",
    ingestion_source: "app_upload", extraction_status: "pending",
    event_date: DAYS(-1), created_at: DAYS(-1) + "T15:00:00Z",
  },
];

const DOCUMENT_FULL: DocumentResponse = {
  id: "dev-doc-001", patient_id: P, uploaded_by: U, caregiver_id: null,
  document_type: "prescription", ingestion_source: "app_upload",
  file_url: "https://placehold.co/800x1100/f5f5f5/333?text=Prescription+PDF",
  file_mime_type: "application/pdf", file_size_bytes: 245_000,
  extraction_status: "approved",
  extracted_text: "Patient: Rajan Kumar | Date: 01-Jun-2024\nRx: Metformin 500mg BD after meals\nRx: Atorvastatin 10mg OD at night\nDr. Suresh Iyer, Diabetologist",
  extracted_data: {
    medications: [
      { generic_name: "Metformin", dose: "500mg", frequency: "Twice daily" },
      { generic_name: "Atorvastatin", dose: "10mg", frequency: "Once daily" },
    ],
  },
  field_confidence: { generic_name: 0.97, dose: 0.95, frequency: 0.88 },
  user_approved_at: "2024-06-02T09:00:00Z",
  rejection_reason: null,
  event_date: "2024-06-01",
  created_at: "2024-06-01T07:00:00Z",
};

// ── Calendar ──────────────────────────────────────────────────────────────────

const CALENDAR_EVENTS: CalendarEventResponse[] = [
  {
    id: "dev-event-001", patient_id: P,
    event_type: "appointment", title: "Nephrology follow-up",
    specialist_type: "Nephrologist",
    event_date: DAYS(5), event_time: "10:30",
    location: "Apollo Hospital, Chennai",
    status: "confirmed", source: null,
    required_tests: ["Creatinine", "eGFR", "Urine ACR"],
    tests_status: { Creatinine: "done", eGFR: "done", "Urine ACR": "pending" },
    is_recurring: false, recurrence_pattern: null, parent_event_id: null,
    confirmed_by: U,
    notes: "Bring all recent lab reports",
    created_at: "2024-01-12T06:00:00Z", updated_at: NOW(),
  },
  {
    id: "dev-event-002", patient_id: P,
    event_type: "lab_test", title: "HbA1c & Kidney Panel",
    specialist_type: null,
    event_date: DAYS(3), event_time: "07:00",
    location: "SRL Diagnostics, Adyar",
    status: "suggested", source: "gap_analysis",
    required_tests: ["HbA1c", "Creatinine", "eGFR", "Potassium"],
    tests_status: {},
    is_recurring: true, recurrence_pattern: "every_3_months", parent_event_id: null,
    confirmed_by: null,
    notes: "Fasting required for 8 hours",
    created_at: NOW(), updated_at: NOW(),
  },
  {
    id: "dev-event-003", patient_id: P,
    event_type: "appointment", title: "Cardiology review",
    specialist_type: "Cardiologist",
    event_date: DAYS(12), event_time: "11:00",
    location: "Fortis Malar, Chennai",
    status: "confirmed", source: null,
    required_tests: ["ECG", "Echocardiogram"],
    tests_status: {},
    is_recurring: false, recurrence_pattern: null, parent_event_id: null,
    confirmed_by: U,
    notes: null,
    created_at: NOW(), updated_at: NOW(),
  },
  {
    id: "dev-event-004", patient_id: P,
    event_type: "prescription_refill", title: "Metformin refill",
    specialist_type: null,
    event_date: DAYS(4), event_time: null,
    location: null,
    status: "suggested", source: "refill_tracker",
    required_tests: [],
    tests_status: {},
    is_recurring: false, recurrence_pattern: null, parent_event_id: null,
    confirmed_by: null,
    notes: "Stock running low",
    created_at: NOW(), updated_at: NOW(),
  },
  {
    id: "dev-event-005", patient_id: P,
    event_type: "appointment", title: "Diabetology follow-up",
    specialist_type: "Diabetologist",
    event_date: DAYS(-10), event_time: "10:00",
    location: "Apollo Hospital, Chennai",
    status: "completed", source: null,
    required_tests: [],
    tests_status: {},
    is_recurring: true, recurrence_pattern: "every_3_months", parent_event_id: null,
    confirmed_by: U,
    notes: "HbA1c improving, continue current regimen",
    created_at: NOW(), updated_at: NOW(),
  },
];

// ── Refills ───────────────────────────────────────────────────────────────────

const REFILLS_DUE: RefillStatusResponse[] = [
  {
    id: "dev-refill-001",
    medication_id: "dev-med-001",
    medication_name: "Metformin 500mg",
    days_until_due: 4,
    urgency: "soon",
    next_refill_date: DAYS(4),
  },
  {
    id: "dev-refill-002",
    medication_id: "dev-med-002",
    medication_name: "Amlodipine 5mg",
    days_until_due: 1,
    urgency: "critical",
    next_refill_date: DAYS(1),
  },
  {
    id: "dev-refill-003",
    medication_id: "dev-med-006",
    medication_name: "Furosemide 20mg",
    days_until_due: 9,
    urgency: "upcoming",
    next_refill_date: DAYS(9),
  },
];

// ── Caregivers ────────────────────────────────────────────────────────────────

const CAREGIVERS: CaregiverResponse[] = [
  {
    id: "dev-cg-001", patient_id: P, added_by: U,
    name: "Kamala Devi",
    phone_number: "+91 99001 23456",
    visit_schedule: ["monday", "wednesday", "friday"],
    visit_start_time: "09:00", visit_end_time: "13:00",
    invitation_status: "confirmed",
    invitation_sent_at: "2024-02-01T08:00:00Z",
    confirmed_at: "2024-02-02T10:00:00Z",
    removed_at: null,
    notes: "Morning caregiver — handles medications and breakfast",
    created_at: "2024-02-01T08:00:00Z",
  },
  {
    id: "dev-cg-002", patient_id: P, added_by: U,
    name: "Ramu Nair",
    phone_number: "+91 98201 45678",
    visit_schedule: ["tuesday", "thursday", "saturday"],
    visit_start_time: "16:00", visit_end_time: "19:00",
    invitation_status: "confirmed",
    invitation_sent_at: "2024-03-10T08:00:00Z",
    confirmed_at: "2024-03-11T09:00:00Z",
    removed_at: null,
    notes: "Evening caregiver — accompanies for walks and evening meals",
    created_at: "2024-03-10T08:00:00Z",
  },
  {
    id: "dev-cg-003", patient_id: P, added_by: U,
    name: "Sunita Sharma",
    phone_number: "+91 97890 34567",
    visit_schedule: ["sunday"],
    visit_start_time: "10:00", visit_end_time: "15:00",
    invitation_status: "pending",
    invitation_sent_at: NOW(),
    confirmed_at: null,
    removed_at: null,
    notes: "Weekend relief caregiver",
    created_at: NOW(),
  },
];

// ── Notifications ─────────────────────────────────────────────────────────────

const NOTIFICATIONS: NotificationResponse[] = [
  {
    id: "dev-notif-001", patient_id: P,
    title: "HbA1c elevated",
    body: "Latest HbA1c reading is 8.2% — above target range. Consider scheduling a diabetology review.",
    type: "lab_alert",
    status: "unread",
    created_at: DAYS(-1) + "T07:00:00Z",
    read_at: null,
  },
  {
    id: "dev-notif-002", patient_id: P,
    title: "Amlodipine refill critical",
    body: "Only 1 day of Amlodipine 5mg remaining. Refill immediately to avoid missed doses.",
    type: "refill_alert",
    status: "unread",
    created_at: DAYS(-1) + "T08:00:00Z",
    read_at: null,
  },
  {
    id: "dev-notif-003", patient_id: P,
    title: "Nephrology appointment in 5 days",
    body: "Reminder: Nephrology follow-up at Apollo Hospital on " + DAYS(5) + " at 10:30 AM. Required tests: Creatinine, eGFR, Urine ACR.",
    type: "appointment_reminder",
    status: "unread",
    created_at: NOW(),
    read_at: null,
  },
  {
    id: "dev-notif-004", patient_id: P,
    title: "Document pending review",
    body: "A recently uploaded lab report requires your review before data is extracted.",
    type: "document_action",
    status: "read",
    created_at: DAYS(-3) + "T10:00:00Z",
    read_at: DAYS(-2) + "T09:00:00Z",
  },
  {
    id: "dev-notif-005", patient_id: P,
    title: "BP log not updated",
    body: "Blood pressure readings have not been logged in 7 days. Regular monitoring is important.",
    type: "gap_alert",
    status: "read",
    created_at: DAYS(-4) + "T09:00:00Z",
    read_at: DAYS(-3) + "T08:00:00Z",
  },
];

// ── Drug Interactions ─────────────────────────────────────────────────────────

const DRUG_INTERACTIONS: DrugInteractionResponse[] = [
  {
    id: "dev-ix-001", patient_id: P,
    drug_a_generic: "Telmisartan",
    drug_b_generic: "Furosemide",
    severity: "moderate",
    mechanism: "Both agents lower blood pressure; combined use can cause additive hypotension, especially on standing.",
    recommendation: "Monitor blood pressure closely. Advise patient to rise slowly. Adjust Furosemide dose if symptomatic hypotension occurs.",
    final_urgency: "watch",
    detected_at: NOW(),
  },
  {
    id: "dev-ix-002", patient_id: P,
    drug_a_generic: "Metformin",
    drug_b_generic: "Furosemide",
    severity: "minor",
    mechanism: "Furosemide may increase blood glucose levels, potentially reducing the efficacy of Metformin.",
    recommendation: "Monitor blood glucose more frequently. Report significant changes to the treating physician.",
    final_urgency: "inform",
    detected_at: NOW(),
  },
];

// ── Crisis ────────────────────────────────────────────────────────────────────

const CRISIS_PACKET: CrisisPacketResponse = {
  patient_id: P,
  emergency_contacts: [
    { name: "Priya Rajan", phone: "+91 98765 43210", relationship: "Daughter" },
    { name: "Suresh Rajan", phone: "+91 94456 78901", relationship: "Son" },
  ],
  emergency_resources: [
    { name: "Apollo Hospital Emergency", phone: "044-28296000", type: "hospital" },
    { name: "National Emergency", phone: "112", type: "government" },
    { name: "Ambulance (Chennai)", phone: "104", type: "ambulance" },
  ],
  de_escalation: [
    "Stay calm and reassure the patient",
    "If chest pain or breathlessness, call ambulance immediately",
    "Do not give any extra medication without doctor guidance",
    "Keep the patient seated or lying down comfortably",
  ],
  critical_medications: MEDICATIONS.filter(m => m.status === "active"),
  allergies: ["Penicillin", "Sulfa drugs"],
  blood_type: "O+",
  conditions: ["Type 2 Diabetes", "Hypertension", "CKD Stage 2"],
  computed_at: NOW(),
};

// ── Chatbot ───────────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { text: "What medications is Rajan taking for blood pressure?", query_type: "sql" },
  { text: "Show me the trend for HbA1c over the last 6 months", query_type: "sql" },
  { text: "Any drug interactions I should know about?", query_type: "semantic" },
  { text: "What labs are due before the nephrology appointment?", query_type: "hybrid" },
  { text: "Summarise Rajan's health status this week", query_type: "semantic" },
];

const DEV_CHAT_RESPONSE: ChatResponse = {
  answer: "**Dev mode** — chatbot mocked. In production this queries your patient's full medical history using AI.\n\nFor Rajan Kumar, the active medications are: Metformin 500mg, Amlodipine 5mg, Telmisartan 40mg, Atorvastatin 10mg, Pantoprazole 40mg, and Furosemide 20mg. Two moderate drug interactions are flagged — Telmisartan + Furosemide (additive hypotension) and Metformin + Furosemide (reduced glycemic control).",
  query_type: "hybrid",
  sources: ["dev-doc-001", "dev-doc-002", "dev-doc-003"],
  proposed_action: undefined,
  suggested_prompts: SUGGESTED_PROMPTS.map(p => p.text),
};

// ── Search ────────────────────────────────────────────────────────────────────

const SEARCH_RESULTS: SearchResponse = {
  results: [
    {
      document_id: "dev-doc-001",
      document_type: "prescription",
      snippet: "Metformin 500mg BD after meals — prescribed by Dr. Suresh Iyer, Diabetologist",
      relevance_type: "semantic",
      score: 0.95,
      event_date: "2024-06-01",
      created_at: "2024-06-01T07:00:00Z",
    },
    {
      document_id: "dev-doc-003",
      document_type: "lab_report",
      snippet: "HbA1c: 8.2% (H) | Creatinine: 1.4 mg/dL (H) | eGFR: 62 mL/min — SRL Diagnostics",
      relevance_type: "sql",
      score: 0.88,
      event_date: DAYS(-21),
      created_at: DAYS(-21) + "T08:30:00Z",
    },
  ],
  query: "",
  total: 2,
};

// ── Patient State + Digest (re-export for pages that don't use dev-fixtures) ──

export const DEV_PATIENT_STATE_FULL: PatientStateResponse = {
  patient_id: P,
  status: "WATCH",
  active_medication_count: MEDICATIONS.filter(m => m.status === "active").length,
  pending_document_count: 2,
  unread_notification_count: 3,
  upcoming_appointment: CALENDAR_EVENTS[0],
  recent_alerts: [
    "HbA1c elevated at 8.2% — last tested 3 weeks ago",
    "Amlodipine refill critical — 1 day remaining",
    "Blood pressure log not updated in 7 days",
  ],
  gap_actions: [
    "Confirm Urine ACR test before nephrology visit",
    "Refill Amlodipine immediately",
  ],
  freshness_score: 72,
  computed_at: NOW(),
};

export const DEV_DIGEST_FULL: DigestResponse = {
  period: "morning",
  generated_at: NOW(),
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
      event_date: DAYS(5),
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

// ── Interceptor ───────────────────────────────────────────────────────────────

type MockHandler = (path: string, body?: unknown) => unknown;

const GET_ROUTES: Array<[RegExp, MockHandler]> = [
  [/^\/patients$/, () => [{ id: P, user_id: U, name: "Rajan Kumar", date_of_birth: "1955-03-15", gender: "male", blood_type: "O+", known_conditions: ["Type 2 Diabetes", "Hypertension", "CKD Stage 2"], known_allergies: ["Penicillin", "Sulfa drugs"], primary_city: "Chennai", emergency_notes: "Allergic to Penicillin. Contact daughter: +91 98765 43210", created_at: "2024-01-10T06:00:00Z", updated_at: NOW() }]],
  [/^\/patients\/[^/]+$/, () => ({ id: P, user_id: U, name: "Rajan Kumar", date_of_birth: "1955-03-15", gender: "male", blood_type: "O+", known_conditions: ["Type 2 Diabetes", "Hypertension", "CKD Stage 2"], known_allergies: ["Penicillin", "Sulfa drugs"], primary_city: "Chennai", emergency_notes: "Allergic to Penicillin. Contact daughter: +91 98765 43210", created_at: "2024-01-10T06:00:00Z", updated_at: NOW() })],
  [/\/state$/, () => DEV_PATIENT_STATE_FULL],
  [/\/digest$/, () => DEV_DIGEST_FULL],
  [/\/medications$/, () => MEDICATIONS],
  [/\/medications\/[^/]+$/, (path) => MEDICATIONS.find(m => path.endsWith(m.id)) ?? MEDICATIONS[0]],
  [/\/lab-results$/, () => LAB_RESULTS],
  [/\/lab-results\/trend\//, () => LAB_RESULTS.map(l => ({ test_name_display: l.test_name_display, test_date: l.test_date, value: l.value, unit: l.unit, is_abnormal: l.is_abnormal, delta: l.delta_from_prev }))],
  [/\/lab-results\/[^/]+$/, (path) => LAB_RESULTS.find(l => path.endsWith(l.id)) ?? LAB_RESULTS[0]],
  [/\/observations$/, () => OBSERVATIONS],
  [/\/documents$/, () => DOCUMENTS],
  [/^\/documents\/[^/]+$/, () => DOCUMENT_FULL],
  [/\/calendar$/, () => CALENDAR_EVENTS],
  [/\/calendar\/[^/]+$/, (path) => CALENDAR_EVENTS.find(e => path.endsWith(e.id)) ?? CALENDAR_EVENTS[0]],
  [/\/refills\/due$/, () => REFILLS_DUE],
  [/\/caregivers$/, () => CAREGIVERS],
  [/\/caregivers\/[^/]+$/, (path) => CAREGIVERS.find(c => path.endsWith(c.id)) ?? CAREGIVERS[0]],
  [/\/notifications\/unread-count$/, () => ({ count: 3 })],
  [/\/notifications$/, () => NOTIFICATIONS],
  [/\/drug-interactions$/, () => DRUG_INTERACTIONS],
  [/\/crisis$/, () => CRISIS_PACKET],
  [/\/chatbot\/suggested-prompts$/, () => SUGGESTED_PROMPTS],
  [/\/search$/, () => SEARCH_RESULTS],
  [/\/doctor-briefing\/[^/]+$/, () => ({
    event_id: "dev-event-001",
    patient_id: P,
    meds_from_other_doctors: [
      { generic_name: "Furosemide", prescriber_name: "Dr. Anand Nair", prescriber_specialty: "Nephrologist", dose: "20mg" },
    ],
    lab_trends: [
      { test_name_display: "HbA1c", direction: "worsening", latest_value: "8.2%", unit: "%", is_abnormal: true },
      { test_name_display: "eGFR", direction: "stable", latest_value: "62", unit: "mL/min", is_abnormal: false },
      { test_name_display: "Creatinine", direction: "worsening", latest_value: "1.4", unit: "mg/dL", is_abnormal: true },
    ],
    behavioral_notes: ["Ankle swelling reported last 2 days", "Medication adherence good", "Limited mobility due to back pain"],
    questions_to_raise: [
      "Should Furosemide dose be adjusted given recent potassium levels?",
      "Is HbA1c target 7.5% appropriate for this patient's age and CKD stage?",
    ],
  })],
  [/\/auth\/me$/, () => ({ id: U, phone_number: "+91 98765 43210", email: null, auth_provider: "phone", name: "Priya Rajan", role: "family_caregiver", preferences: {}, created_at: "2024-01-10T06:00:00Z", last_login_at: NOW() })],
  [/\/onboarding\/progress$/, () => ({ completed_steps: [1, 2, 3, 4, 5], pending_steps: [], total_steps: 5 })],
  [/\/onboarding\/status$/, () => ({ complete: true })],
];

const POST_ROUTES: Array<[RegExp, MockHandler]> = [
  [/\/chatbot\/query$/, () => DEV_CHAT_RESPONSE],
  [/\/chatbot\/action\/confirm$/, () => ({ ...DEV_CHAT_RESPONSE, answer: "Action confirmed (dev mock).", proposed_action: undefined })],
  [/\/calendar\/[^/]+\/confirm$/, (path) => { const id = path.split("/").at(-2)!; return CALENDAR_EVENTS.find(e => e.id === id) ?? { ...CALENDAR_EVENTS[0], status: "confirmed" }; }],
  [/\/refills\/[^/]+\/confirm$/, () => ({ id: "dev-refill-001", patient_id: P, medication_id: "dev-med-001", days_supply: 30, last_refill_date: NOW().slice(0, 10), next_refill_date: DAYS(30), confirmed_at: NOW(), created_at: NOW() })],
  [/\/crisis\/enter$/, () => CRISIS_PACKET],
  [/\/crisis\/exit$/, () => ({ message: "Crisis mode exited" })],
  [/\/notifications\/mark-read$/, () => ({ message: "Marked as read" })],
  [/\/drug-interactions\/check$/, () => ({ message: "Interaction check queued" })],
  [/\/caregivers\/[^/]+\/reinvite$/, () => ({ message: "Reinvite sent" })],
];

function matchRoute(routes: Array<[RegExp, MockHandler]>, path: string, body?: unknown): unknown | null {
  for (const [pattern, handler] of routes) {
    if (pattern.test(path)) return handler(path, body);
  }
  return null;
}

export function devIntercept(method: string, path: string, body?: unknown): unknown {
  if (method === "GET" || method === "DELETE") {
    const result = matchRoute(GET_ROUTES, path);
    if (result !== null) return result;
  }
  if (method === "POST" || method === "PATCH" || method === "PUT") {
    const result = matchRoute(POST_ROUTES, path, body);
    if (result !== null) return result;
    // Generic write fallback: echo body back or return success
    if (method === "POST") return { message: "Created (dev mock)", id: `dev-${Date.now()}`, ...(typeof body === "object" ? body as object : {}) };
    return { message: "Updated (dev mock)", ...(typeof body === "object" ? body as object : {}) };
  }
  if (method === "DELETE") return undefined; // 204
  return null;
}
