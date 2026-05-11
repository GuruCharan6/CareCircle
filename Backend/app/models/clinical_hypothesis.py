from datetime import datetime
from typing import Any
from uuid import UUID

from app.models.base import ORMBase


class ClinicalHypothesis(ORMBase):
    id: UUID
    patient_id: UUID
    rule_id: str
    trigger_event_type: str
    trigger_event_id: UUID
    hypothesis_text: str
    confidence: str
    urgency: str
    supporting_evidence: list[Any] = []
    status: str = "active"
    resolved_at: datetime | None = None
    dismissed_by: UUID | None = None
    created_at: datetime | None = None
