from datetime import datetime
from typing import Any
from uuid import UUID

from app.models.base import ORMBase


class CrisisPacket(ORMBase):
    id: UUID
    patient_id: UUID
    generated_at: datetime
    rebuild_triggered_by: str
    medications: list[Any] = []
    last_cardiac_event: dict[str, Any] | None = None
    emergency_contacts: list[Any] = []
    nearest_emergency: dict[str, Any] | None = None
    known_allergies: list[str] = []
    blood_type: str | None = None
    active_alerts: list[str] = []
    known_conditions: list[str] = []
    lab_results: list[Any] = []
    prescribers: list[Any] = []
    is_current: bool = True
    updated_at: datetime | None = None
    patient_name: str | None = None
    patient_dob: str | None = None
