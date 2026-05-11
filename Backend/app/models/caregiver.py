from datetime import datetime, time
from uuid import UUID

from app.models.base import ORMBase


class Caregiver(ORMBase):
    id: UUID
    patient_id: UUID
    added_by: UUID
    name: str
    phone_number: str
    visit_schedule: list[str] = []
    visit_start_time: time | None = None
    visit_end_time: time | None = None
    invitation_status: str = "pending"
    invitation_sent_at: datetime | None = None
    confirmed_at: datetime | None = None
    removed_at: datetime | None = None
    notes: str | None = None
    created_at: datetime | None = None
