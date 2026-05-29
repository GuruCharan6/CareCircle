from __future__ import annotations

import builtins
from typing import TYPE_CHECKING
from uuid import UUID

import asyncpg

from app.cache.medication_cache import (
    get_active_medications,
    invalidate_active_medications,
    set_active_medications,
)
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.medication import Medication
from app.repositories.drug_interaction_repository import DrugInteractionRepository
from app.repositories.medication_repository import MedicationRepository
from app.schemas.medication import MedicationCreate
from app.worker.events import on_medication_added

if TYPE_CHECKING:
    from app.schemas.medication import MedicationUpdate


class MedicationService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._repo = MedicationRepository(conn)

    async def create(self, patient_id: UUID, data: MedicationCreate) -> Medication:
        med = await self._repo.create(
            patient_id=patient_id,
            source_document_id=data.source_document_id,
            generic_name=data.generic_name,
            dose=data.dose,
            frequency=data.frequency,
            valid_from=data.valid_from,
            brand_name=data.brand_name,
            drug_class=data.drug_class,
            timing=data.timing,
            prescriber_name=data.prescriber_name,
            prescriber_specialty=data.prescriber_specialty,
            prescriber_hospital=data.prescriber_hospital,
            prescribed_date=data.prescribed_date,
            notes=data.notes,
        )
        await invalidate_active_medications(patient_id)  # stale after new med
        on_medication_added(str(patient_id))
        return med

    async def list(self, patient_id: UUID, active_only: bool = False) -> builtins.list[Medication]:
        if active_only:
            return await self.list_active(patient_id)
        return await self._repo.get_by_patient_id(patient_id)

    async def list_active(self, patient_id: UUID) -> builtins.list[Medication]:
        """Cache-aside: Redis (10-min TTL) → miss → asyncpg → set cache."""
        cached = await get_active_medications(patient_id)
        if cached is not None:
            return [Medication(**m) for m in cached]
        meds = await self._repo.get_active_by_patient(patient_id)
        await set_active_medications(
            patient_id, [m.model_dump(mode="json") for m in meds]
        )
        return meds

    async def update(self, patient_id: UUID, medication_id: UUID, data: MedicationUpdate) -> Medication:
        await self.get(patient_id, medication_id)  # ownership check
        updated = await self._repo.update(
            medication_id,
            brand_name=data.brand_name,
            generic_name=data.generic_name,
            drug_class=data.drug_class,
            dose=data.dose,
            frequency=data.frequency,
            timing=data.timing,
            timing_slots=data.timing_slots,
            prescriber_id=data.prescriber_id,
            prescriber_name=data.prescriber_name,
            prescriber_specialty=data.prescriber_specialty,
            prescriber_hospital=data.prescriber_hospital,
            prescribed_date=data.prescribed_date,
            notes=data.notes,
        )
        if not updated:
            raise NotFoundError("Medication", str(medication_id))
        await invalidate_active_medications(patient_id)
        return updated

    async def get(self, patient_id: UUID, medication_id: UUID) -> Medication:
        med = await self._repo.get_by_id(medication_id)
        if not med:
            raise NotFoundError("Medication", str(medication_id))
        if med.patient_id != patient_id:
            raise ForbiddenError("Access denied to this medication")
        return med

    async def discontinue(self, patient_id: UUID, medication_id: UUID) -> None:
        med = await self.get(patient_id, medication_id)
        await self._repo.discontinue(med.id)
        ix_repo = DrugInteractionRepository(self._repo.conn)
        await ix_repo.delete_by_medication_id(med.id)
        await invalidate_active_medications(patient_id)  # stale after discontinue

    async def list_by_document(self, document_id: UUID) -> builtins.list[Medication]:
        return await self._repo.get_by_document(document_id)
