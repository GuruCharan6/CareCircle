from datetime import date, datetime
from typing import Any
from uuid import UUID

from app.models.base import ORMBase


class Observation(ORMBase):
    id: UUID
    patient_id: UUID
    source_type: str
    caregiver_id: UUID | None = None
    source_document_id: UUID | None = None
    observation_date: date
    symptoms_reported: list[str] = []
    symptoms_denied: list[str] = []
    symptoms_absent: list[str] = []
    meals_eaten: dict[str, Any] | None = None
    meal_notes: str | None = None
    medications_taken: bool | None = None
    medication_timing_notes: str | None = None
    mobility_notes: str | None = None
    mood: str | None = None
    energy_level: str | None = None
    meera_mood_read: str | None = None
    concerns_flagged: list[str] = []
    raw_transcript: str | None = None
    source_document_url: str | None = None
    caregiver_name: str | None = None
    created_at: datetime | None = None
