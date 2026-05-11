from datetime import date, datetime
from typing import Any
from uuid import UUID

from app.models.base import ORMBase


class MedicationRefill(ORMBase):
    id: UUID
    medication_id: UUID
    patient_id: UUID
    days_supply: int
    prescription_start_date: date
    refill_due_date: date
    supply_source: str
    is_default_assumption: bool = False
    refill_confirmed_at: datetime | None = None
    reminder_sent_at: list[Any] = []
    notes: str | None = None
    created_at: datetime | None = None
