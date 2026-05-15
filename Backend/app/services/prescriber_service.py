from __future__ import annotations
from typing import List

from uuid import UUID

import asyncpg

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.prescriber import Prescriber
from app.repositories.prescriber_repository import PrescriberRepository
from app.schemas.prescriber import PrescriberCreate, PrescriberUpdate


class PrescriberService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._repo = PrescriberRepository(conn)

    async def create(self, patient_id: UUID, data: PrescriberCreate) -> Prescriber:
        return await self._repo.create(
            patient_id=patient_id,
            name=data.name,
            specialty=data.specialty,
            hospital=data.hospital,
            phone=data.phone,
            notes=data.notes,
        )

    async def list(self, patient_id: UUID, active_only: bool = False) -> List[Prescriber]:
        return await self._repo.get_by_patient(patient_id, active_only=active_only)

    async def get(self, patient_id: UUID, prescriber_id: UUID) -> Prescriber:
        p = await self._repo.get_by_id(prescriber_id)
        if not p:
            raise NotFoundError("Prescriber", str(prescriber_id))
        if p.patient_id != patient_id:
            raise ForbiddenError("Access denied to this prescriber")
        return p

    async def update(self, patient_id: UUID, prescriber_id: UUID, data: PrescriberUpdate) -> Prescriber:
        await self.get(patient_id, prescriber_id)  # ownership check
        updated = await self._repo.update(
            prescriber_id,
            name=data.name,
            specialty=data.specialty,
            hospital=data.hospital,
            phone=data.phone,
            notes=data.notes,
        )
        if not updated:
            raise NotFoundError("Prescriber", str(prescriber_id))
        return updated

    async def deactivate(self, patient_id: UUID, prescriber_id: UUID) -> None:
        """Soft-remove doctor. Their past medications remain in history."""
        await self.get(patient_id, prescriber_id)  # ownership check
        await self._repo.deactivate(prescriber_id)

    async def reactivate(self, patient_id: UUID, prescriber_id: UUID) -> None:
        await self.get(patient_id, prescriber_id)
        await self._repo.reactivate(prescriber_id)
