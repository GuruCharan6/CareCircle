from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class StalenessIndicator(BaseModel):
    """Per-source staleness for dashboard staleness bar."""
    source: str          # 'lab'|'caregiver_note'|'meera_log'|'prescription'
    last_date: date | None = None
    days_since: int | None = None
    status: str          # 'fresh'|'aging'|'stale'|'critical'
    threshold_days: int  # staleness threshold for this source type


class PatientStateResponse(BaseModel):
    """
    Single aggregated current state — one row per patient.
    Dashboard STATUS card + staleness bar derive from this.
    Updated after every pipeline cycle.
    """
    id: UUID
    patient_id: UUID
    overall_status: str          # 'ok'|'watch'|'alert'|'unknown'|'cannot_assess'
    biochemical_confidence: str  # 'high'|'medium'|'low'|'unknown'
    behavioral_confidence: str
    subjective_confidence: str
    clinical_confidence: str
    last_lab_date: date | None = None
    last_caregiver_note_date: date | None = None
    last_meera_log_date: date | None = None
    last_prescription_date: date | None = None
    active_medication_count: int
    active_alerts_count: int
    active_watch_count: int
    active_conflicts_count: int
    staleness_status: str        # 'fresh'|'aging'|'stale'|'critical'
    last_digest_summary: str | None = None
    updated_at: datetime
    # Computed for dashboard staleness bar
    freshness_score: int = 0
    computed_at: datetime
    staleness_indicators: list[StalenessIndicator] = []
    # List of next appointments (usually just 1, but could be multiple if on the same day)
    upcoming_appointments: list[dict] = []
    # New: surfaced alerts for "Needs Attention" section
    drug_interactions: list[dict] = []
    refill_alerts: list[dict] = []
    gap_actions: list[str] = []
    emergency_follow_ups: list[dict] = []
    suggested_appointments: list[dict] = []
