from datetime import time
from uuid import UUID

from app.models.caregiver import Caregiver
from app.repositories.base import BaseRepository


class CaregiverRepository(BaseRepository):
    async def get_by_id(self, caregiver_id: UUID) -> Caregiver | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.caregivers WHERE id = $1", caregiver_id
        )
        return Caregiver.from_record(row) if row else None

    async def get_by_patient_id(self, patient_id: UUID, active_only: bool = True) -> list[Caregiver]:
        if active_only:
            rows = await self.conn.fetch(
                """
                SELECT * FROM public.caregivers
                WHERE patient_id = $1 AND invitation_status != 'inactive'
                ORDER BY created_at ASC
                """,
                patient_id,
            )
        else:
            rows = await self.conn.fetch(
                "SELECT * FROM public.caregivers WHERE patient_id = $1 ORDER BY created_at ASC",
                patient_id,
            )
        return [Caregiver.from_record(r) for r in rows]

    async def get_by_phone(self, phone_number: str) -> Caregiver | None:
        row = await self.conn.fetchrow(
            """
            SELECT * FROM public.caregivers
            WHERE phone_number = $1 AND invitation_status IN ('confirmed', 'pending')
            ORDER BY created_at DESC
            LIMIT 1
            """,
            phone_number,
        )
        return Caregiver.from_record(row) if row else None

    async def create(
        self,
        *,
        patient_id: UUID,
        added_by: UUID,
        name: str,
        phone_number: str,
        visit_schedule: list[str] | None = None,
        visit_start_time: time | None = None,
        visit_end_time: time | None = None,
        notes: str | None = None,
    ) -> Caregiver:
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.caregivers
              (patient_id, added_by, name, phone_number,
               visit_schedule, visit_start_time, visit_end_time, notes)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *
            """,
            patient_id, added_by, name, phone_number,
            visit_schedule or [], visit_start_time, visit_end_time, notes,
        )
        return Caregiver.from_record(row)

    async def update_invitation_status(
        self, caregiver_id: UUID, status: str
    ) -> Caregiver | None:
        set_confirmed = "confirmed_at = now()," if status == "confirmed" else ""
        row = await self.conn.fetchrow(
            f"""
            UPDATE public.caregivers
            SET invitation_status = $2,
                {set_confirmed}
                removed_at = CASE WHEN $2 = 'inactive' THEN now() ELSE removed_at END
            WHERE id = $1
            RETURNING *
            """,
            caregiver_id, status,
        )
        return Caregiver.from_record(row) if row else None

    async def mark_invitation_sent(self, caregiver_id: UUID) -> None:
        await self.conn.execute(
            "UPDATE public.caregivers SET invitation_sent_at = now() WHERE id = $1",
            caregiver_id,
        )

    async def update(
        self,
        caregiver_id: UUID,
        *,
        name: str | None = None,
        phone_number: str | None = None,
        visit_schedule: list[str] | None = None,
        visit_start_time: time | None = None,
        visit_end_time: time | None = None,
        notes: str | None = None,
    ) -> Caregiver:
        row = await self.conn.fetchrow(
            """
            UPDATE public.caregivers
            SET name = COALESCE($2, name),
                phone_number = COALESCE($3, phone_number),
                visit_schedule = COALESCE($4, visit_schedule),
                visit_start_time = COALESCE($5, visit_start_time),
                visit_end_time = COALESCE($6, visit_end_time),
                notes = COALESCE($7, notes)
            WHERE id = $1
            RETURNING *
            """,
            caregiver_id, name, phone_number, visit_schedule,
            visit_start_time, visit_end_time, notes,
        )
        return Caregiver.from_record(row)
