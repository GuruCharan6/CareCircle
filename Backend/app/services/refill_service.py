from __future__ import annotations

from datetime import date
from uuid import UUID

import asyncpg

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.medication_refill import MedicationRefill
from app.repositories.medication_refill_repository import MedicationRefillRepository
from app.repositories.medication_repository import MedicationRepository
from app.schemas.refill import RefillConfirmRequest, RefillCreate, RefillStatusResponse


class RefillService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._repo = MedicationRefillRepository(conn)
        self._med_repo = MedicationRepository(conn)

    async def create(self, patient_id: UUID, data: RefillCreate) -> MedicationRefill:
        return await self._repo.create(
            medication_id=data.medication_id,
            patient_id=patient_id,
            days_supply=data.days_supply,
            prescription_start_date=data.prescription_start_date,
            supply_source=data.supply_source,
            notes=data.notes,
        )

    async def list_due_soon(
        self, patient_id: UUID, within_days: int = 10
    ) -> list[RefillStatusResponse]:
        refills = await self._repo.get_due_soon(patient_id, within_days=within_days)
        today = date.today()
        result = []
        for refill in refills:
            med = await self._med_repo.get_by_id(refill.medication_id)
            days_remaining = (refill.refill_due_date - today).days
            if days_remaining <= 3:
                urgency = "alert"
            elif days_remaining <= 7:
                urgency = "watch"
            else:
                urgency = "ok"
            result.append(
                RefillStatusResponse(
                    medication_id=refill.medication_id,
                    generic_name=med.generic_name if med else "Unknown",
                    brand_name=med.brand_name if med else None,
                    refill_due_date=refill.refill_due_date,
                    days_remaining=days_remaining,
                    urgency=urgency,
                    is_default_assumption=refill.is_default_assumption,
                )
            )
        return result

    async def get(self, patient_id: UUID, refill_id: UUID) -> MedicationRefill:
        refill = await self._repo.get_by_id(refill_id)
        if not refill:
            raise NotFoundError("Refill", str(refill_id))
        if refill.patient_id != patient_id:
            raise ForbiddenError("Access denied to this refill")
        return refill

    async def confirm(
        self, patient_id: UUID, refill_id: UUID, data: RefillConfirmRequest
    ) -> MedicationRefill:
        await self.get(patient_id, refill_id)
        confirmed = await self._repo.confirm_refill(refill_id)
        if not confirmed:
            raise NotFoundError("Refill", str(refill_id))
        return confirmed
