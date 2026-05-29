from datetime import date
from uuid import UUID

from app.models.medication_refill import MedicationRefill
from app.repositories.base import BaseRepository


class MedicationRefillRepository(BaseRepository):
    async def get_by_id(self, refill_id: UUID) -> MedicationRefill | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.medication_refills WHERE id = $1", refill_id
        )
        return MedicationRefill.from_record(row) if row else None

    async def get_by_medication(self, medication_id: UUID) -> list[MedicationRefill]:
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.medication_refills
            WHERE medication_id = $1
            ORDER BY prescription_start_date DESC
            """,
            medication_id,
        )
        return [MedicationRefill.from_record(r) for r in rows]

    async def get_due_soon(self, patient_id: UUID, within_days: int = 10) -> list[MedicationRefill]:
        rows = await self.conn.fetch(
            """
            SELECT r.* FROM public.medication_refills r
            JOIN public.medications m ON r.medication_id = m.id
            WHERE r.patient_id = $1
              AND m.status = 'active'
              AND r.refill_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $2::int
              AND r.refill_confirmed_at IS NULL
            ORDER BY r.refill_due_date ASC
            """,
            patient_id, within_days,
        )
        return [MedicationRefill.from_record(r) for r in rows]

    async def create(
        self,
        *,
        medication_id: UUID,
        patient_id: UUID,
        days_supply: int,
        prescription_start_date: date,
        supply_source: str,
        is_default_assumption: bool = False,
        notes: str | None = None,
    ) -> MedicationRefill:
        refill_due = "($5::date + $4::int - 7)"
        row = await self.conn.fetchrow(
            f"""
            INSERT INTO public.medication_refills
              (medication_id, patient_id, days_supply,
               prescription_start_date, refill_due_date,
               supply_source, is_default_assumption, notes)
            VALUES ($1,$2,$3,$4, {refill_due},$6,$7,$8)
            RETURNING *
            """,
            medication_id, patient_id, days_supply,
            days_supply, prescription_start_date,
            supply_source, is_default_assumption, notes,
        )
        return MedicationRefill.from_record(row)

    async def confirm_refill(self, refill_id: UUID) -> MedicationRefill | None:
        row = await self.conn.fetchrow(
            """
            UPDATE public.medication_refills
            SET refill_confirmed_at = now()
            WHERE id = $1
            RETURNING *
            """,
            refill_id,
        )
        return MedicationRefill.from_record(row) if row else None

    async def add_reminder_level(self, refill_id: UUID, level: str) -> None:
        await self.conn.execute(
            """
            UPDATE public.medication_refills
            SET reminder_sent_at = reminder_sent_at || $2::jsonb
            WHERE id = $1
            """,
            refill_id, f'["{level}"]',
        )
