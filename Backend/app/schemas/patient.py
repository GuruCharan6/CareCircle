from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class EmergencyContact(BaseModel):
    name: str
    phone: str
    relationship: str


class Physician(BaseModel):
    name: str
    phone: str


class NearestHospital(BaseModel):
    name: str
    phone: str


class PatientCreate(BaseModel):
    name: str
    date_of_birth: date | None = None
    gender: str | None = None  # 'male' | 'female' | 'other'
    blood_type: str | None = None  # 'A+' | 'B+' | 'O+' etc.
    known_conditions: list[str] = []
    known_allergies: list[str] = []
    primary_city: str | None = None
    emergency_notes: str | None = None
    emergency_contact_primary: EmergencyContact | None = None
    emergency_contact_secondary: EmergencyContact | None = None
    primary_physician: Physician | None = None
    nearest_hospital: NearestHospital | None = None


class PatientUpdate(BaseModel):
    name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    blood_type: str | None = None
    known_conditions: list[str] | None = None
    known_allergies: list[str] | None = None
    primary_city: str | None = None
    emergency_notes: str | None = None
    emergency_contact_primary: EmergencyContact | None = None
    emergency_contact_secondary: EmergencyContact | None = None
    primary_physician: Physician | None = None
    nearest_hospital: NearestHospital | None = None


class PatientResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    date_of_birth: date | None = None
    gender: str | None = None
    blood_type: str | None = None
    known_conditions: list[str]
    known_allergies: list[str]
    primary_city: str | None = None
    emergency_notes: str | None = None
    emergency_contact_primary: dict[str, Any] | None = None
    emergency_contact_secondary: dict[str, Any] | None = None
    primary_physician: dict[str, Any] | None = None
    nearest_hospital: dict[str, Any] | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
