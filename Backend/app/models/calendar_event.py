from datetime import date, datetime, time
from typing import Any
from uuid import UUID

from app.models.base import ORMBase


class CalendarEvent(ORMBase):
    id: UUID
    patient_id: UUID
    event_type: str
    title: str
    specialist_type: str | None = None
    event_date: date
    event_time: time | None = None
    location: str | None = None
    status: str = "suggested"
    source: str
    required_tests: list[str] = []
    tests_status: dict[str, Any] = {}
    reminder_sent_at: list[str] = []
    is_recurring: bool = False
    recurrence_pattern: str | None = None
    parent_event_id: UUID | None = None
    confirmed_by: UUID | None = None
    notes: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
