from __future__ import annotations

from uuid import UUID

from app.models.prescriber import Prescriber
from app.repositories.base import BaseRepository


class PrescriberRepository(BaseRepository):
    async def get_by_id(self, prescriber_id: UUID) -> Prescriber | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.prescribers WHERE id = $1",
            prescriber_id,
        )
        return Prescriber.from_record(row) if row else None

    async def get_by_patient(self, patient_id: UUID, active_only: bool = False) -> list[Prescriber]:
        query = "SELECT * FROM public.prescribers WHERE patient_id = $1"
        if active_only:
            query += " AND status = 'active'"
        query += " ORDER BY created_at DESC"
        rows = await self.conn.fetch(query, patient_id)
        return [Prescriber.from_record(r) for r in rows]

    async def create(
        self,
        *,
        patient_id: UUID,
        name: str,
        specialty: str | None = None,
        hospital: str | None = None,
        phone: str | None = None,
        notes: str | None = None,
    ) -> Prescriber:
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.prescribers
              (patient_id, name, specialty, hospital, phone, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            """,
            patient_id, name, specialty, hospital, phone, notes,
        )
        return Prescriber.from_record(row)

    async def update(
        self,
        prescriber_id: UUID,
        *,
        name: str | None = None,
        specialty: str | None = None,
        hospital: str | None = None,
        phone: str | None = None,
        notes: str | None = None,
    ) -> Prescriber | None:
        row = await self.conn.fetchrow(
            """
            UPDATE public.prescribers SET
              name      = COALESCE($2, name),
              specialty = COALESCE($3, specialty),
              hospital  = COALESCE($4, hospital),
              phone     = COALESCE($5, phone),
              notes     = COALESCE($6, notes)
            WHERE id = $1
            RETURNING *
            """,
            prescriber_id, name, specialty, hospital, phone, notes,
        )
        return Prescriber.from_record(row) if row else None

    async def deactivate(self, prescriber_id: UUID) -> None:
        """Soft-remove: status = 'inactive'. History preserved."""
        await self.conn.execute(
            "UPDATE public.prescribers SET status = 'inactive' WHERE id = $1",
            prescriber_id,
        )

    async def reactivate(self, prescriber_id: UUID) -> None:
        await self.conn.execute(
            "UPDATE public.prescribers SET status = 'active' WHERE id = $1",
            prescriber_id,
        )
