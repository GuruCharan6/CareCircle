from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, model_validator


class ObservationCreate(BaseModel):
    source_type: str  # 'caregiver_voice' | 'meera_call_log'
    caregiver_id: UUID | None = None  # required if source_type='caregiver_voice'
    source_document_id: UUID | None = None  # links to raw audio file in source_documents
    observation_date: date
    symptoms_reported: list[str] = []
    symptoms_denied: list[str] = []
    symptoms_absent: list[str] = []  # what Meera noticed Dad did NOT mention — most important field
    meals_eaten: dict[str, Any] | None = None  # {breakfast: true, lunch: false, dinner: true}
    meal_notes: str | None = None
    medications_taken: bool | None = None
    medication_timing_notes: str | None = None
    mobility_notes: str | None = None
    mood: str | None = None  # 'normal'|'good'|'low'|'anxious'|'irritable'|'confused'
    energy_level: str | None = None  # 'normal'|'low'|'very_low'
    meera_mood_read: str | None = None  # meera_call_log only
    concerns_flagged: list[str] = []
    raw_transcript: str | None = None

    @model_validator(mode="after")
    def caregiver_id_required_for_voice(self) -> "ObservationCreate":
        if self.source_type == "caregiver_voice" and not self.caregiver_id:
            raise ValueError("caregiver_id required when source_type='caregiver_voice'")
        return self


class ObservationResponse(BaseModel):
    id: UUID
    patient_id: UUID
    source_type: str
    caregiver_id: UUID | None = None
    source_document_id: UUID | None = None
    observation_date: date
    symptoms_reported: list[str]
    symptoms_denied: list[str]
    symptoms_absent: list[str]
    meals_eaten: dict[str, Any] | None = None
    meal_notes: str | None = None
    medications_taken: bool | None = None
    medication_timing_notes: str | None = None
    mobility_notes: str | None = None
    mood: str | None = None
    energy_level: str | None = None
    meera_mood_read: str | None = None
    concerns_flagged: list[str]
    raw_transcript: str | None = None
    source_document_url: str | None = None
    caregiver_name: str | None = None
    created_at: datetime | None = None
