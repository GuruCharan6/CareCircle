from uuid import UUID

import asyncpg

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.patient import Patient
from app.repositories.patient_repository import PatientRepository
from app.schemas.patient import PatientCreate, PatientUpdate


class PatientService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._repo = PatientRepository(conn)

    async def create(self, user_id: UUID, data: PatientCreate) -> Patient:
        return await self._repo.create(
            user_id=user_id,
            name=data.name,
            date_of_birth=data.date_of_birth,
            gender=data.gender,
            blood_type=data.blood_type,
            known_conditions=data.known_conditions,
            known_allergies=data.known_allergies,
            primary_city=data.primary_city,
            emergency_notes=data.emergency_notes,
            emergency_contact_primary=data.emergency_contact_primary.model_dump() if data.emergency_contact_primary else None,
            emergency_contact_secondary=data.emergency_contact_secondary.model_dump() if data.emergency_contact_secondary else None,
            primary_physician=data.primary_physician.model_dump() if data.primary_physician else None,
            nearest_hospital=data.nearest_hospital.model_dump() if data.nearest_hospital else None,
        )

    async def get(self, patient_id: UUID, user_id: UUID) -> Patient:
        patient = await self._repo.get_by_id(patient_id)
        if not patient:
            raise NotFoundError("Patient", str(patient_id))
        if patient.user_id != user_id:
            raise ForbiddenError("Access denied to this patient")
        return patient

    async def list_by_user(self, user_id: UUID) -> list[Patient]:
        return await self._repo.get_by_user_id(user_id)

    async def update(self, patient_id: UUID, user_id: UUID, data: PatientUpdate) -> Patient:
        await self.get(patient_id, user_id)
        updated = await self._repo.update(
            patient_id,
            name=data.name,
            date_of_birth=data.date_of_birth,
            gender=data.gender,
            blood_type=data.blood_type,
            known_conditions=data.known_conditions,
            known_allergies=data.known_allergies,
            primary_city=data.primary_city,
            emergency_notes=data.emergency_notes,
            emergency_contact_primary=data.emergency_contact_primary.model_dump() if data.emergency_contact_primary else None,
            emergency_contact_secondary=data.emergency_contact_secondary.model_dump() if data.emergency_contact_secondary else None,
            primary_physician=data.primary_physician.model_dump() if data.primary_physician else None,
            nearest_hospital=data.nearest_hospital.model_dump() if data.nearest_hospital else None,
        )
        if not updated:
            raise NotFoundError("Patient", str(patient_id))
        return updated

    async def delete(self, patient_id: UUID, user_id: UUID) -> None:
        await self.get(patient_id, user_id)
        deleted = await self._repo.delete(patient_id)
        if not deleted:
            raise NotFoundError("Patient", str(patient_id))
