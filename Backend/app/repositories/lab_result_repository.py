from datetime import date
from decimal import Decimal
from uuid import UUID

from app.models.lab_result import LabResult
from app.repositories.base import BaseRepository


class LabResultRepository(BaseRepository):
    async def get_by_id(self, result_id: UUID) -> LabResult | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.lab_results WHERE id = $1", result_id
        )
        return LabResult.from_record(row) if row else None

    async def get_by_patient_id(self, patient_id: UUID, limit: int = 100) -> list[LabResult]:
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.lab_results
            WHERE patient_id = $1
            ORDER BY test_date DESC
            LIMIT $2
            """,
            patient_id, limit,
        )
        return [LabResult.from_record(r) for r in rows]

    async def get_latest_by_test(
        self, patient_id: UUID, test_name: str
    ) -> LabResult | None:
        row = await self.conn.fetchrow(
            """
            SELECT * FROM public.lab_results
            WHERE patient_id = $1 AND test_name = $2
            ORDER BY test_date DESC
            LIMIT 1
            """,
            patient_id, test_name,
        )
        return LabResult.from_record(row) if row else None

    async def get_trend(
        self, patient_id: UUID, test_name: str, limit: int = 5
    ) -> list[LabResult]:
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.lab_results
            WHERE patient_id = $1 AND test_name = $2
            ORDER BY test_date DESC
            LIMIT $3
            """,
            patient_id, test_name, limit,
        )
        return [LabResult.from_record(r) for r in rows]

    async def create(
        self,
        *,
        patient_id: UUID,
        source_document_id: UUID | None,
        test_name: str,
        test_name_display: str,
        value: Decimal | None = None,
        unit: str | None = None,
        test_date: date,
        reference_range_low: Decimal | None = None,
        reference_range_high: Decimal | None = None,
        is_abnormal: bool | None = None,
        specialist_type: str | None = None,
        lab_name: str | None = None,
        delta_from_prev: Decimal | None = None,
        rate_of_change: Decimal | None = None,
        prev_reading_id: UUID | None = None,
        prev_reading_date: date | None = None,
    ) -> LabResult:
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.lab_results
              (patient_id, source_document_id, test_name, test_name_display,
               value, unit, reference_range_low, reference_range_high,
               is_abnormal, specialist_type, lab_name, test_date,
               delta_from_prev, rate_of_change, prev_reading_id, prev_reading_date)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
            RETURNING *
            """,
            patient_id, source_document_id, test_name, test_name_display,
            value, unit, reference_range_low, reference_range_high,
            is_abnormal, specialist_type, lab_name, test_date,
            delta_from_prev, rate_of_change, prev_reading_id, prev_reading_date,
        )
        return LabResult.from_record(row)

    async def get_by_document(self, document_id: UUID) -> list[LabResult]:
        rows = await self.conn.fetch(
            "SELECT * FROM public.lab_results WHERE source_document_id = $1",
            document_id,
        )
        return [LabResult.from_record(r) for r in rows]
