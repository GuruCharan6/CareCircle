from datetime import date, datetime
from uuid import UUID

from app.models.base import ORMBase


class GapAction(ORMBase):
    id: UUID
    patient_id: UUID
    action_type: str
    test_name: str | None = None
    medication_id: UUID | None = None
    for_appointment_id: UUID | None = None
    due_by: date
    responsible_party: str
    urgency: str
    status: str = "pending"
    escalation_level: int = 0
    last_escalation_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime | None = None
