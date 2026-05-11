from uuid import UUID

from app.models.conflict_record import ConflictRecord
from app.repositories.base import BaseRepository


class ConflictRecordRepository(BaseRepository):
    async def get_by_id(self, conflict_id: UUID) -> ConflictRecord | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.conflict_records WHERE id = $1", conflict_id
        )
        return ConflictRecord.from_record(row) if row else None

    async def get_active_by_patient(self, patient_id: UUID) -> list[ConflictRecord]:
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.conflict_records
            WHERE patient_id = $1 AND status = 'active'
            ORDER BY created_at DESC
            """,
            patient_id,
        )
        return [ConflictRecord.from_record(r) for r in rows]

    async def create(
        self,
        *,
        patient_id: UUID,
        conflict_type: str,
        source_a_type: str,
        source_a_id: UUID,
        source_a_dimension: str,
        source_b_type: str,
        source_b_id: UUID,
        source_b_dimension: str,
        conflict_description: str,
        is_resolvable: bool,
        meera_suggested_action: str | None = None,
    ) -> ConflictRecord:
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.conflict_records
              (patient_id, conflict_type,
               source_a_type, source_a_id, source_a_dimension,
               source_b_type, source_b_id, source_b_dimension,
               conflict_description, is_resolvable, meera_suggested_action)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *
            """,
            patient_id, conflict_type,
            source_a_type, source_a_id, source_a_dimension,
            source_b_type, source_b_id, source_b_dimension,
            conflict_description, is_resolvable, meera_suggested_action,
        )
        return ConflictRecord.from_record(row)

    async def acknowledge(self, conflict_id: UUID) -> None:
        await self.conn.execute(
            """
            UPDATE public.conflict_records
            SET status = 'acknowledged', acknowledged_at = now()
            WHERE id = $1
            """,
            conflict_id,
        )

    async def resolve(self, conflict_id: UUID) -> None:
        await self.conn.execute(
            """
            UPDATE public.conflict_records
            SET status = 'resolved', resolved_at = now()
            WHERE id = $1
            """,
            conflict_id,
        )
