from datetime import date, datetime, time
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class CalendarEventCreate(BaseModel):
    event_type: str  # 'appointment'|'caregiver_visit'|'lab_test'
    title: str
    specialist_type: str | None = None  # 'cardiologist'|'endocrinologist'|'general_physician'
    event_date: date
    event_time: time | None = None
    location: str | None = None
    source: str = "manual"  # 'manual'|'prescription_ingestion'|'gap_detection'|'voice_log'|'doctor_note_extraction'
    required_tests: list[str] = []
    is_recurring: bool = False
    recurrence_pattern: str | None = None  # 'monday,wednesday,friday'
    parent_event_id: UUID | None = None
    notes: str | None = None


class CalendarEventUpdate(BaseModel):
    title: str | None = None
    specialist_type: str | None = None
    event_date: date | None = None
    event_time: time | None = None
    location: str | None = None
    status: str | None = None  # 'suggested'|'confirmed'|'completed'|'cancelled'
    required_tests: list[str] | None = None
    tests_status: dict[str, Any] | None = None
    notes: str | None = None


class CalendarEventConfirm(BaseModel):
    event_id: UUID


class CalendarEventResponse(BaseModel):
    id: UUID
    patient_id: UUID
    event_type: str
    title: str
    specialist_type: str | None = None
    event_date: date
    event_time: time | None = None
    location: str | None = None
    status: str  # 'suggested'|'confirmed'|'completed'|'cancelled'
    source: str
    required_tests: list[str]
    tests_status: dict[str, Any]
    reminder_sent_at: list[str]
    is_recurring: bool
    recurrence_pattern: str | None = None
    parent_event_id: UUID | None = None
    confirmed_by: UUID | None = None
    notes: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class CalendarEventListItem(BaseModel):
    """Compact form for dashboard UPCOMING section (next 3 events)."""
    id: UUID
    event_type: str
    title: str
    event_date: date
    event_time: time | None = None
    status: str
    tests_pending: int = 0  # count of required_tests still 'pending'
    days_until: int | None = None
