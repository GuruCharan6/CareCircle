from datetime import datetime
from typing import Any
from uuid import UUID

from app.models.base import ORMBase


class DrugInteractionResult(ORMBase):
    id: UUID
    patient_id: UUID
    medication_a_id: UUID
    medication_b_id: UUID
    drug_a_generic: str
    drug_b_generic: str
    interaction: str
    severity: str | None = None
    mechanism: str | None = None
    gemini_confidence: str | None = None
    gemini_note: str | None = None
    gemini_raw_response: dict[str, Any]
    lab_modifier_applied: bool = False
    final_urgency: str
    notification_sent: bool = False
    checked_at: datetime
