from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class MedicationCreate(BaseModel):
    source_document_id: UUID | None = None
    brand_name: str | None = None
    generic_name: str
    drug_class: str | None = None
    dose: str
    frequency: str
    timing: str | None = None          # raw extraction text: 'after meals', 'morning'
    timing_slots: list[str] = []       # structured picker: ['morning', 'night'] etc.
    prescriber_id: UUID | None = None  # link to prescribers table (optional)
    prescriber_name: str | None = None
    prescriber_specialty: str | None = None  # 'endocrinology' | 'cardiology'
    prescriber_hospital: str | None = None
    prescribed_date: date | None = None
    valid_from: date
    notes: str | None = None


class MedicationUpdate(BaseModel):
    brand_name: str | None = None
    generic_name: str | None = None
    drug_class: str | None = None
    dose: str | None = None
    frequency: str | None = None
    timing: str | None = None
    timing_slots: list[str] | None = None  # None = no change; [] = clear all slots
    prescriber_id: UUID | None = None
    prescriber_name: str | None = None
    prescriber_specialty: str | None = None
    prescriber_hospital: str | None = None
    prescribed_date: date | None = None
    notes: str | None = None


class MedicationResponse(BaseModel):
    id: UUID
    patient_id: UUID
    source_document_id: UUID | None = None
    brand_name: str | None = None
    generic_name: str
    drug_class: str | None = None
    dose: str
    frequency: str
    timing: str | None = None
    timing_slots: list[str] = []       # structured slots — empty if not set
    prescriber_id: UUID | None = None
    prescriber_name: str | None = None
    prescriber_specialty: str | None = None
    prescriber_hospital: str | None = None
    prescribed_date: date | None = None
    status: str  # 'active' | 'superseded' | 'discontinued'
    superseded_by: UUID | None = None
    valid_from: date
    valid_until: date | None = None
    notes: str | None = None
    body_systems: list[str] = []  # e.g. ["Diabetes", "Metabolic"] — derived from drug_generic_lookup
    created_at: datetime | None = None


class RefillDaysRequest(BaseModel):
    """Posted immediately after prescription approval to capture supply duration."""
    medication_id: UUID
    days_supply: int  # 30 | 60 | 90 or user-entered
