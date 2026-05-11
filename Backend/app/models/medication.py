from datetime import date, datetime
from uuid import UUID

from app.models.base import ORMBase


class Medication(ORMBase):
    id: UUID
    patient_id: UUID
    source_document_id: UUID | None = None
    brand_name: str | None = None
    generic_name: str
    drug_class: str | None = None
    dose: str
    frequency: str
    timing: str | None = None
    timing_slots: list[str] = []        # structured: ['morning', 'night'] etc.
    prescriber_id: UUID | None = None   # FK to prescribers table (nullable)
    prescriber_name: str | None = None
    prescriber_specialty: str | None = None
    prescriber_hospital: str | None = None
    prescribed_date: date | None = None
    status: str = "active"
    superseded_by: UUID | None = None
    valid_from: date
    valid_until: date | None = None
    notes: str | None = None
    body_systems: list[str] = []
    created_at: datetime | None = None
