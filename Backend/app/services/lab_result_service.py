from __future__ import annotations

from uuid import UUID

import asyncpg

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.lab_result import LabResult
from app.repositories.lab_result_repository import LabResultRepository
from app.schemas.lab_result import LabResultCreate


class LabResultService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._repo = LabResultRepository(conn)

    async def create(self, patient_id: UUID, data: LabResultCreate) -> LabResult:
        prev = await self._repo.get_latest_by_test(patient_id, data.test_name)
        delta = None
        rate = None
        prev_id = None
        prev_date = None
        if prev:
            delta = data.value - prev.value
            days = (data.test_date - prev.test_date).days
            rate = delta / days if days > 0 else None
            prev_id = prev.id
            prev_date = prev.test_date

        return await self._repo.create(
            patient_id=patient_id,
            source_document_id=data.source_document_id,
            test_name=data.test_name,
            test_name_display=data.test_name_display,
            value=data.value,
            unit=data.unit,
            test_date=data.test_date,
            reference_range_low=data.reference_range_low,
            reference_range_high=data.reference_range_high,
            is_abnormal=data.is_abnormal,
            specialist_type=data.specialist_type,
            lab_name=data.lab_name,
            delta_from_prev=delta,
            rate_of_change=rate,
            prev_reading_id=prev_id,
            prev_reading_date=prev_date,
        )

    async def list(self, patient_id: UUID, limit: int = 100) -> list[LabResult]:
        return await self._repo.get_by_patient_id(patient_id, limit=limit)

    async def get(self, patient_id: UUID, result_id: UUID) -> LabResult:
        result = await self._repo.get_by_id(result_id)
        if not result:
            raise NotFoundError("LabResult", str(result_id))
        if result.patient_id != patient_id:
            raise ForbiddenError("Access denied to this lab result")
        return result

    async def trend(self, patient_id: UUID, test_name: str, limit: int = 5) -> list[LabResult]:
        return await self._repo.get_trend(patient_id, test_name, limit=limit)

    async def list_by_document(self, document_id: UUID) -> list[LabResult]:
        return await self._repo.get_by_document(document_id)
