from __future__ import annotations
from typing import List

from uuid import UUID

import asyncpg

from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.logging import get_logger
from app.models.caregiver import Caregiver
from app.providers.whatsapp.factory import get_whatsapp_provider
from app.repositories.caregiver_repository import CaregiverRepository
from app.schemas.caregiver import CaregiverCreate

logger = get_logger(__name__)


class CaregiverService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._repo = CaregiverRepository(conn)

    async def add(self, patient_id: UUID, user_id: UUID, data: CaregiverCreate) -> Caregiver:
        caregiver = await self._repo.create(
            patient_id=patient_id,
            added_by=user_id,
            name=data.name,
            phone_number=data.phone_number,
            visit_schedule=data.visit_schedule,
            visit_start_time=data.visit_start_time,
            visit_end_time=data.visit_end_time,
            notes=data.notes,
        )
        await self._send_invitation(caregiver)
        return caregiver

    async def _send_invitation(self, caregiver: Caregiver) -> None:
        provider = get_whatsapp_provider()
        try:
            body = (
                f"Hello {caregiver.name}! You've been added as a caregiver on CareCircle. "
                "Reply YES to confirm, or NO to decline."
            )
            await provider.send_text(caregiver.phone_number, body)
            await self._repo.mark_invitation_sent(caregiver.id)
        except Exception as exc:
            logger.error(
                "caregiver_service.invitation_failed",
                caregiver_id=str(caregiver.id),
                error=str(exc),
            )

    async def list(self, patient_id: UUID, active_only: bool = True) -> List[Caregiver]:
        return await self._repo.get_by_patient_id(patient_id, active_only=active_only)

    async def get(self, patient_id: UUID, caregiver_id: UUID) -> Caregiver:
        caregiver = await self._repo.get_by_id(caregiver_id)
        if not caregiver:
            raise NotFoundError("Caregiver", str(caregiver_id))
        if caregiver.patient_id != patient_id:
            raise ForbiddenError("Access denied to this caregiver")
        return caregiver

    async def remove(self, patient_id: UUID, caregiver_id: UUID) -> None:
        caregiver = await self.get(patient_id, caregiver_id)
        await self._repo.update_invitation_status(caregiver.id, "inactive")

    async def reinvite(self, patient_id: UUID, caregiver_id: UUID) -> None:
        caregiver = await self.get(patient_id, caregiver_id)
        await self._send_invitation(caregiver)

    async def update(self, patient_id: UUID, caregiver_id: UUID, data: CaregiverCreate) -> Caregiver:
        await self.get(patient_id, caregiver_id)  # Access check
        return await self._repo.update(
            caregiver_id=caregiver_id,
            name=data.name,
            phone_number=data.phone_number,
            visit_schedule=data.visit_schedule,
            visit_start_time=data.visit_start_time,
            visit_end_time=data.visit_end_time,
            notes=data.notes,
        )
