from datetime import datetime, time
from uuid import UUID

from pydantic import BaseModel, field_validator


class CaregiverCreate(BaseModel):
    name: str
    phone_number: str  # E.164 format — WhatsApp number
    visit_schedule: list[str] = []  # ['monday', 'wednesday', 'friday']
    visit_start_time: time | None = None
    visit_end_time: time | None = None
    notes: str | None = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Strip all whitespace (e.g. "+91 799..." -> "+91799...")
        v = "".join(v.split())
        if not v.startswith("+"):
            raise ValueError("phone_number must be E.164 format (starting with +)")
        return v

    @field_validator("visit_schedule")
    @classmethod
    def validate_days(cls, v: list[str]) -> list[str]:
        valid = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"}
        for day in v:
            if day.lower() not in valid:
                raise ValueError(f"Invalid visit day: {day}")
        return [d.lower() for d in v]


class CaregiverUpdate(BaseModel):
    name: str | None = None
    visit_schedule: list[str] | None = None
    visit_start_time: time | None = None
    visit_end_time: time | None = None
    notes: str | None = None


class CaregiverResponse(BaseModel):
    id: UUID
    patient_id: UUID
    added_by: UUID
    name: str
    phone_number: str
    visit_schedule: list[str]
    visit_start_time: time | None = None
    visit_end_time: time | None = None
    invitation_status: str  # 'pending'|'confirmed'|'declined'|'inactive'
    invitation_sent_at: datetime | None = None
    confirmed_at: datetime | None = None
    removed_at: datetime | None = None
    notes: str | None = None
    created_at: datetime | None = None


class CaregiverRemoveResponse(BaseModel):
    message: str
    caregiver_id: UUID
