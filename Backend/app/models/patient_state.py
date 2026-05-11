from datetime import date, datetime
from uuid import UUID

from app.models.base import ORMBase


class PatientState(ORMBase):
    id: UUID
    patient_id: UUID
    overall_status: str = "unknown"
    biochemical_confidence: str = "unknown"
    behavioral_confidence: str = "unknown"
    subjective_confidence: str = "unknown"
    clinical_confidence: str = "unknown"
    last_lab_date: date | None = None
    last_caregiver_note_date: date | None = None
    last_meera_log_date: date | None = None
    last_prescription_date: date | None = None
    active_medication_count: int = 0
    active_alerts_count: int = 0
    active_watch_count: int = 0
    active_conflicts_count: int = 0
    staleness_status: str = "unknown"
    last_digest_summary: str | None = None
    updated_at: datetime
