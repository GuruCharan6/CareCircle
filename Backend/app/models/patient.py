from datetime import date, datetime
from typing import Any
from uuid import UUID

from app.models.base import ORMBase


class Patient(ORMBase):
    id: UUID
    user_id: UUID
    name: str
    date_of_birth: date | None = None
    gender: str | None = None
    blood_type: str | None = None
    known_conditions: list[str] = []
    known_allergies: list[str] = []
    primary_city: str | None = None
    emergency_notes: str | None = None
    emergency_contact_primary: dict[str, Any] | None = None
    emergency_contact_secondary: dict[str, Any] | None = None
    primary_physician: dict[str, Any] | None = None
    nearest_hospital: dict[str, Any] | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
