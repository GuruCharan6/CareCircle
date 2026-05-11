from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any
from uuid import UUID


@dataclass
class IngestedItem:
    """
    Layer 1 output — structured data from one approved source document.

    source_type:
        'prescription' | 'lab_report' | 'doctor_note' |
        'voice_note_caregiver' | 'voice_note_meera' | 'handwritten_note'

    extracted_data: typed fields for this source type (see each extractor).
    confidence_per_field: 0.0–1.0 per field; fields < 0.7 = uncertain.
    min_confidence: lowest confidence across all fields (quality gate).
    raw_text: transcript for voice notes, full extracted text for others.
    """

    source_type: str
    source_document_id: UUID
    patient_id: UUID
    event_time: date
    ingestion_time: datetime
    extracted_data: dict[str, Any]
    confidence_per_field: dict[str, float] = field(default_factory=dict)
    raw_text: str | None = None

    @property
    def min_confidence(self) -> float:
        if not self.confidence_per_field:
            return 1.0
        return min(self.confidence_per_field.values())

    @property
    def is_prescription(self) -> bool:
        return self.source_type == "prescription"

    @property
    def is_lab_report(self) -> bool:
        return self.source_type == "lab_report"

    @property
    def is_voice_note(self) -> bool:
        return self.source_type in ("voice_note_caregiver", "voice_note_meera")

    @property
    def is_observation_source(self) -> bool:
        return self.source_type in (
            "voice_note_caregiver",
            "voice_note_meera",
            "doctor_note",
            "handwritten_note",
        )
