from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CrisisLabResultItem(BaseModel):
    test_name: str
    value: str
    unit: str | None = None
    reference_range: str | None = None
    is_abnormal: bool | None = None
    test_date: str


class CrisisMedicationItem(BaseModel):
    brand: str | None = None
    generic: str
    dose: str
    frequency: str
    timing: str | None = None
    is_active: bool = True


class CrisisEmergencyContact(BaseModel):
    name: str
    relationship: str | None = None
    specialty: str | None = None
    phone: str | None = None
    hospital: str | None = None


class CrisisPrescriberItem(BaseModel):
    name: str
    specialty: str | None = None
    hospital: str | None = None
    phone: str | None = None


class CrisisNearestEmergency(BaseModel):
    name: str
    address: str = ""
    phone: str | None = None
    distance_km: float | None = None


class CrisisLastCardiacEvent(BaseModel):
    date: str
    summary: str


class CrisisPacketResponse(BaseModel):
    """Pre-computed packet — zero LLM call on access, fetched from cache or DB."""
    id: UUID
    patient_id: UUID
    generated_at: datetime
    rebuild_triggered_by: str  # 'nightly_cron'|'medication_change'|'contact_change'
    medications: list[CrisisMedicationItem]
    last_cardiac_event: CrisisLastCardiacEvent | None = None
    emergency_contacts: list[CrisisEmergencyContact]
    nearest_emergency: CrisisNearestEmergency | None = None
    known_allergies: list[str]
    blood_type: str | None = None
    active_alerts: list[str]
    known_conditions: list[str] = []
    lab_results: list[CrisisLabResultItem] = []
    prescribers: list[CrisisPrescriberItem] = []
    is_current: bool
    updated_at: datetime | None = None
    # Meera sees freshness — never silently presented as current
    freshness_note: str  # e.g. 'Last updated 2 hours ago'
    patient_name: str | None = None
    patient_dob: str | None = None


class CrisisAccessLog(BaseModel):
    """Posted when Meera opens crisis card — logged for next-morning digest."""
    accessed_at: datetime
    trigger: str  # 'button_tap'|'keyword_detected'
