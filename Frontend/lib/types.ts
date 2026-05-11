// ── Common ────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface ErrorResponse {
  error: string;
  detail: string;
  request_id: string;
}

export interface SuccessResponse {
  message: string;
  data?: unknown;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export type AuthProvider = "phone" | "google";
export type UserRole = "family_caregiver" | "professional_caregiver";

export interface UserResponse {
  id: string;
  phone_number: string | null;
  email: string | null;
  auth_provider: AuthProvider;
  name: string | null;
  role: UserRole | null;
  preferences: Record<string, unknown>;
  created_at: string;
  last_login_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserResponse;
}

export interface OTPSendRequest {
  phone_number: string;
}

export interface OTPSendResponse {
  message: string;
  phone_number: string;
}

export interface OTPVerifyRequest {
  phone_number: string;
  token: string;
}

export interface GoogleAuthRequest {
  id_token: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// ── Patient ───────────────────────────────────────────────────────────────────

export type Gender = "male" | "female" | "other";
export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Physician {
  name: string;
  phone: string;
}

export interface NearestHospital {
  name: string;
  phone: string;
}

export interface PatientCreate {
  name: string;
  date_of_birth: string;
  gender: Gender;
  blood_type?: BloodType;
  known_conditions?: string[];
  known_allergies?: string[];
  primary_city?: string;
  emergency_notes?: string;
  emergency_contact_primary?: EmergencyContact;
  emergency_contact_secondary?: EmergencyContact;
  primary_physician?: Physician;
  nearest_hospital?: NearestHospital;
}

export interface PatientUpdate extends Partial<PatientCreate> { }

export interface PatientResponse {
  id: string;
  user_id: string;
  name: string;
  date_of_birth: string;
  gender: Gender;
  blood_type: BloodType | null;
  known_conditions: string[];
  known_allergies: string[];
  primary_city: string | null;
  emergency_notes: string | null;
  emergency_contact_primary: EmergencyContact | null;
  emergency_contact_secondary: EmergencyContact | null;
  primary_physician: Physician | null;
  nearest_hospital: NearestHospital | null;
  created_at: string;
  updated_at: string;
}

// ── Medication ────────────────────────────────────────────────────────────────

export type MedicationStatus = "active" | "superseded" | "discontinued";

export interface TimingSlot {
  time: string;
  label?: string;
}

export interface MedicationCreate {
  source_document_id?: string;
  generic_name: string;
  brand_name?: string;
  drug_class?: string;
  dose?: string;
  frequency?: string;
  timing?: string;
  timing_slots?: TimingSlot[];
  prescriber_id?: string;
  prescriber_name?: string;
  prescriber_specialty?: string;
  prescriber_hospital?: string;
  prescribed_date?: string;
  valid_from?: string;
  valid_until?: string;
  notes?: string;
}

export interface MedicationUpdate extends Partial<MedicationCreate> { }

export interface MedicationResponse {
  id: string;
  patient_id: string;
  source_document_id: string | null;
  generic_name: string;
  brand_name: string | null;
  drug_class: string | null;
  dose: string | null;
  frequency: string | null;
  timing: string | null;
  timing_slots: TimingSlot[];
  prescriber_id: string | null;
  prescriber_name: string | null;
  prescriber_specialty: string | null;
  prescriber_hospital: string | null;
  prescribed_date: string | null;
  valid_from: string | null;
  valid_until: string | null;
  status: MedicationStatus;
  superseded_by: string | null;
  body_systems: string[];
  notes: string | null;
  created_at: string;
}

// ── Lab Results ───────────────────────────────────────────────────────────────

export interface LabResultCreate {
  source_document_id?: string;
  test_name: string;
  value: number;
  unit: string;
  reference_range_low?: number;
  reference_range_high?: number;
  is_abnormal?: boolean;
  specialist_type?: string;
  lab_name?: string;
  test_date: string;
}

export interface LabResultResponse {
  id: string;
  patient_id: string;
  source_document_id: string | null;
  test_name: string;
  test_name_display: string;
  value: number;
  unit: string;
  reference_range_low: number | null;
  reference_range_high: number | null;
  is_abnormal: boolean;
  specialist_type: string | null;
  lab_name: string | null;
  test_date: string;
  delta_from_prev: number | null;
  rate_of_change: number | null;
  prev_reading_id: string | null;
  prev_reading_date: string | null;
  created_at: string;
}

export interface LabTrendItem {
  test_name_display: string;
  test_date: string;
  value: number;
  unit: string;
  is_abnormal: boolean;
  delta: number | null;
}

// ── Observation ───────────────────────────────────────────────────────────────

export type ObservationSource = "manual_entry" | "voice_note" | "caregiver_note" | "voice_log" | "emergency_note";

export interface ObservationCreate {
  source_type: ObservationSource;
  observation_date: string;
  source_document_id?: string;
  caregiver_id?: string;
  symptoms_reported?: string[];
  symptoms_denied?: string[];
  symptoms_absent?: string[];
  meals_eaten?: Record<string, string>;
  meal_notes?: string;
  medications_taken?: boolean;
  medication_timing_notes?: string;
  mobility_notes?: string;
  mood?: string;
  energy_level?: string;
  concerns_flagged?: string[];
  raw_transcript?: string;
}

export interface ObservationResponse {
  id: string;
  patient_id: string;
  source_document_id: string | null;
  source_type: ObservationSource;
  caregiver_id: string | null;
  observation_date: string;
  symptoms_reported: string[];
  symptoms_denied: string[];
  symptoms_absent: string[];
  meals_eaten: Record<string, string>;
  meal_notes: string | null;
  medications_taken: boolean | null;
  medication_timing_notes: string | null;
  mobility_notes: string | null;
  mood: string | null;
  energy_level: string | null;
  meera_mood_read: string | null;
  concerns_flagged: string[];
  raw_transcript: string | null;
  source_document_url: string | null;
  caregiver_name: string | null;
  created_at: string;
}

// ── Document ──────────────────────────────────────────────────────────────────

export type DocumentType =
  | "prescription"
  | "lab_report"
  | "voice_note"
  | "doctor_note"
  | "handwritten_note"
  | "other";

export type IngestionSource = "app_upload" | "os_share_sheet" | "camera" | "crisis_follow_up";

export type ExtractionStatus =
  | "pending"
  | "extracting"
  | "review_required"
  | "approved"
  | "rejected"
  | "failed";

export interface SignedUploadURLRequest {
  document_type: DocumentType;
  ingestion_source: IngestionSource;
  file_mime_type: string;
  file_size_bytes: number;
  content_hash?: string;
}

export interface SignedUploadURLResponse {
  upload_url: string;
  document_id: string;
  expires_at: string;
}

export interface DocumentApproveRequest {
  extracted_data: Record<string, unknown>;
  extracted_text?: string;
  event_date?: string;
}

export interface DocumentRejectRequest {
  rejection_reason: string;
}

export interface DocumentResponse {
  id: string;
  patient_id: string;
  uploaded_by: string;
  caregiver_id: string | null;
  document_type: DocumentType;
  ingestion_source: IngestionSource;
  file_url: string;
  file_mime_type: string;
  file_size_bytes: number;
  extraction_status: ExtractionStatus;
  extracted_text: string | null;
  extracted_data: Record<string, unknown> | null;
  field_confidence: Record<string, number> | null;
  user_approved_at: string | null;
  rejection_reason: string | null;
  event_date: string | null;
  created_at: string;
}

export interface DocumentListItem {
  id: string;
  document_type: DocumentType;
  ingestion_source: IngestionSource;
  extraction_status: ExtractionStatus;
  event_date: string | null;
  file_size_bytes: number | null;
  extracted_data: Record<string, any> | null;
  created_at: string;
}

// ── Calendar ──────────────────────────────────────────────────────────────────

export type EventType =
  | "appointment"
  | "followup"
  | "caregiver_visit"
  | "prescription_refill"
  | "lab_test"
  | "medication_review";

export type EventStatus = "suggested" | "confirmed" | "completed" | "cancelled";

export interface CalendarEventCreate {
  event_type: EventType;
  title: string;
  specialist_type?: string;
  event_date: string;
  event_time?: string;
  location?: string;
  required_tests?: string[];
  is_recurring?: boolean;
  recurrence_pattern?: string;
  notes?: string;
}

export interface CalendarEventUpdate extends Partial<CalendarEventCreate> { }

export interface CalendarEventResponse {
  id: string;
  patient_id: string;
  event_type: EventType;
  title: string;
  specialist_type: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  status: EventStatus;
  source: string | null;
  required_tests: string[];
  tests_status: Record<string, string>;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  parent_event_id: string | null;
  confirmed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Refill ────────────────────────────────────────────────────────────────────

export interface RefillCreate {
  medication_id: string;
  days_supply: number;
}

export interface RefillResponse {
  id: string;
  patient_id: string;
  medication_id: string;
  days_supply: number;
  last_refill_date: string | null;
  next_refill_date: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface RefillStatusResponse {
  id: string;
  medication_id: string;
  medication_name: string;
  days_until_due: number;
  urgency: "critical" | "soon" | "upcoming";
  next_refill_date: string;
}

// ── Caregiver ─────────────────────────────────────────────────────────────────

export type InvitationStatus = "pending" | "confirmed";

export interface CaregiverCreate {
  name: string;
  phone_number: string;
  visit_schedule?: string[];
  visit_start_time?: string;
  visit_end_time?: string;
  notes?: string;
}

export interface CaregiverResponse {
  id: string;
  patient_id: string;
  added_by: string;
  name: string;
  phone_number: string;
  visit_schedule: string[];
  visit_start_time: string | null;
  visit_end_time: string | null;
  invitation_status: InvitationStatus;
  invitation_sent_at: string | null;
  confirmed_at: string | null;
  removed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface CaregiverRemoveResponse {
  message: string;
  caregiver_id: string;
}

// ── Drug Interaction ──────────────────────────────────────────────────────────

export interface DrugInteractionResponse {
  id: string;
  patient_id: string;
  drug_a_generic: string;
  drug_b_generic: string;
  drug_class?: string;
  severity: InteractionSeverity;
  mechanism: string;
  recommendation?: string;
  final_urgency: "alert" | "watch" | "inform";
  detected_at: string;
}

export type InteractionSeverity = "contraindicated" | "major" | "moderate" | "minor" | "low";

// ── Notification ──────────────────────────────────────────────────────────────

export type NotificationType =
  | "alert"
  | "drug_interaction_alert"
  | "watch_event_card"
  | "refill_reminder"
  | "calendar_reminder"
  | "staleness_notice"
  | "crisis_access"
  | "crisis_follow_up"
  | "crisis_follow_up_response"
  | "morning_digest"
  | "evening_digest"
  | "caregiver_update_request"
  | "caregiver_visit_reminder"
  | string; // forward-compat

export interface NotificationResponse {
  id: string;
  patient_id: string;
  title: string;
  body: string;
  type: NotificationType;
  channel: string;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  action_deep_link: string | null;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  created_at: string;
  sent_at: string | null;
  read_at: string | null;
  acknowledged_at: string | null;
  acknowledge_action: "handled" | "ongoing" | null;
  is_unread: boolean;         // computed by backend
  requires_acknowledge: boolean; // computed by backend — alerts need explicit tap
}

export interface UnreadCountResponse {
  unread_count: number;  // fixed: was "count"
}

export interface MarkReadRequest {
  notification_ids: string[];
}

export interface AcknowledgeRequest {
  action: "handled" | "ongoing";
}

// ── Patient State ─────────────────────────────────────────────────────────────

export type PatientStatus = "OK" | "WATCH" | "ALERT";

export interface StalenessIndicator {
  source: string;
  last_date: string | null;
  days_since: number | null;
  status: 'fresh' | 'aging' | 'stale' | 'critical';
  threshold_days: number;
}

export interface PatientStateResponse {
  id: string;
  patient_id: string;
  overall_status: string;
  biochemical_confidence: string;
  behavioral_confidence: string;
  subjective_confidence: string;
  clinical_confidence: string;
  last_lab_date: string | null;
  last_caregiver_note_date: string | null;
  last_meera_log_date: string | null;
  last_prescription_date: string | null;
  active_medication_count: number;
  active_alerts_count: number;
  active_watch_count: number;
  active_conflicts_count: number;
  staleness_status: string;
  last_digest_summary: string | null;
  freshness_score: number;
  updated_at: string;
  computed_at: string;
  recent_alerts: string[];
  gap_actions?: string[];
  drug_interactions: Array<{
    id: string;
    drug_a_generic: string;
    drug_b_generic: string;
    severity: string;
    mechanism: string | null;
    checked_at: string;
    final_urgency: string;
  }>;
  refill_alerts: Array<{
    medication_id: string;
    generic_name: string;
    brand_name: string | null;
    days_remaining: number;
    urgency: string;
    due_date: string;
  }>;
  emergency_follow_ups: Array<{
    id: string;
    title: string;
    body: string;
    created_at: string;
    deep_link: string | null;
  }>;
  suggested_appointments: Array<CalendarEventResponse>;
  staleness_indicators: StalenessIndicator[];
}

// ── Digest ────────────────────────────────────────────────────────────────────

export type DigestPeriod = "morning" | "evening";

export interface DigestUpcomingEvent {
  event_id: string;
  title: string;
  event_date: string;
  days_until: number;
  tests_pending: string[];
}

export interface DigestRefillAlert {
  medication_id: string;
  generic_name: string;
  brand_name: string | null;
  days_remaining: number;
  urgency: string;
}

export interface DigestResponse {
  period: DigestPeriod;
  generated_at: string;
  overall_status: string;
  today_summary: string;
  known_facts: string[];
  hypotheses: string[];
  unknowns: string[];
  needs_action: string | null;
  upcoming_events: DigestUpcomingEvent[];
  refill_alerts: DigestRefillAlert[];
  staleness_flags: string[];
  upload_cta_token: string | null;
}

export interface DigestPreferencesUpdate {
  morning_time?: string;
  evening_time?: string;
  timezone?: string;
}

// ── Crisis ────────────────────────────────────────────────────────────────────

export type CrisisTrigger = "button_tap" | "keyword_detection";

export interface CrisisMedicationItem {
  brand: string | null;
  generic: string;
  dose: string;
  frequency: string;
  timing: string | null;
  is_active: boolean;
}

export interface CrisisEmergencyContact {
  name: string;
  relationship: string | null;
  specialty: string | null;
  phone: string;
  hospital: string | null;
}

export interface CrisisPrescriberItem {
  name: string;
  specialty: string | null;
  hospital: string | null;
  phone: string | null;
}

export interface CrisisNearestEmergency {
  name: string;
  address: string;
  distance_km: number | null;
}

export interface CrisisLastCardiacEvent {
  date: string;
  summary: string;
}

export interface CrisisPacketResponse {
  id: string;
  patient_id: string;
  generated_at: string;
  rebuild_triggered_by: string;
  medications: CrisisMedicationItem[];
  last_cardiac_event: CrisisLastCardiacEvent | null;
  emergency_contacts: CrisisEmergencyContact[];
  nearest_emergency: CrisisNearestEmergency | null;
  known_allergies: string[];
  blood_type: string | null;
  active_alerts: string[];
  known_conditions: string[];
  lab_results: LabResultResponse[];
  prescribers: CrisisPrescriberItem[];
  is_current: boolean;
  updated_at: string | null;
  freshness_note: string;
  patient_name: string | null;
  patient_dob: string | null;
}

// ── Chatbot ───────────────────────────────────────────────────────────────────

export type ChatQueryType = "sql" | "semantic" | "hybrid";

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  query: string;
  query_type?: ChatQueryType;
  history?: ChatHistoryItem[];
  local_time?: string;
}

export interface ProposedAction {
  action_type: string;
  description: string;
  payload: Record<string, any>;
}

export interface ChatResponse {
  answer: string;
  query_type: ChatQueryType;
  sources: string[];
  proposed_actions: ProposedAction[];
  processing_steps: string[];
  suggested_prompts: SuggestedPrompt[];
  redirect_url?: string;
}

export interface SuggestedPrompt {
  text: string;
  query_type: ChatQueryType;
}

export interface ChatActionConfirm {
  action_type: string;
  payload: Record<string, unknown>;
}

// ── Search ────────────────────────────────────────────────────────────────────

export type RelevanceType = "sql" | "semantic";

export interface SearchResultItem {
  entity_id: string;
  entity_type: string;
  title: string;
  subtitle: string | null;
  event_date: string | null;
  created_at: string;
  excerpt: string | null;
  relevance_type: string;
  score: number;
  metadata: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResultItem[];
  query: string;
  total: number;
}

// ── Doctor Briefing ───────────────────────────────────────────────────────────

export interface PdfUrlResponse {
  signed_url: string;
  expires_in_seconds: number;
}

// ── Prescriber ────────────────────────────────────────────────────────────────

export interface PrescriberCreate {
  name: string;
  specialty?: string;
  hospital?: string;
  phone?: string;
  email?: string;
}

export interface PrescriberUpdate extends Partial<PrescriberCreate> { }

export interface PrescriberResponse {
  id: string;
  patient_id: string;
  name: string;
  specialty: string | null;
  hospital: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export interface OnboardingProgressResponse {
  completed_steps: number[];
  pending_steps: number[];
  total_steps: number;
}

export interface OnboardingStatusResponse {
  complete: boolean;
}
