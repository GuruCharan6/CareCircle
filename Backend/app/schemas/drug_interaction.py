from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class InteractionCheckRequest(BaseModel):
    """Manually trigger interaction check for a set of medication IDs.
    Normally auto-fired after prescription approval — this is for on-demand re-check."""
    medication_ids: list[UUID]


class DrugInteractionResponse(BaseModel):
    id: UUID
    patient_id: UUID
    medication_a_id: UUID
    medication_b_id: UUID
    drug_a_generic: str
    drug_b_generic: str
    drug_class: str | None = None
    interaction: str      # 'confirmed'|'possible'|'unknown'
    severity: str | None = None  # 'high'|'moderate'|'low'|null
    mechanism: str | None = None  # one-sentence plain English
    recommendation: str | None = None
    gemini_confidence: str | None = None  # 'high'|'medium'|'low'
    gemini_note: str | None = None  # populated only when interaction='unknown'
    lab_modifier_applied: bool
    final_urgency: str   # 'alert'|'watch'|'inform' — after lab-value modifier
    notification_sent: bool
    checked_at: datetime

    @classmethod
    def from_orm(cls, obj: Any) -> "DrugInteractionResponse":
        # Extract fields from gemini_raw_response if missing in model
        raw = getattr(obj, "gemini_raw_response", {})
        return cls(
            **obj.model_dump(),
            drug_class=getattr(obj, "drug_class", raw.get("drug_class")),
            recommendation=getattr(obj, "recommendation", raw.get("recommendation")),
        )


class DrugInteractionSummary(BaseModel):
    """Compact form for dashboard / crisis packet active alerts list."""
    drug_a_generic: str
    drug_b_generic: str
    interaction: str
    severity: str | None = None
    final_urgency: str
    checked_at: datetime
