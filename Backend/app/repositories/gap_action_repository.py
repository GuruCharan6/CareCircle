from datetime import date
from uuid import UUID

from app.models.gap_action import GapAction
from app.repositories.base import BaseRepository


class GapActionRepository(BaseRepository):
    async def get_by_id(self, action_id: UUID) -> GapAction | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.gap_actions WHERE id = $1", action_id
        )
        return GapAction.from_record(row) if row else None

    async def get_pending_by_patient(self, patient_id: UUID) -> list[GapAction]:
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.gap_actions
            WHERE patient_id = $1 AND status IN ('pending', 'in_progress')
            ORDER BY due_by ASC
            """,
            patient_id,
        )
        return [GapAction.from_record(r) for r in rows]

    async def get_by_appointment(self, appointment_id: UUID) -> list[GapAction]:
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.gap_actions
            WHERE for_appointment_id = $1
            ORDER BY due_by ASC
            """,
            appointment_id,
        )
        return [GapAction.from_record(r) for r in rows]

    async def create(
        self,
        *,
        patient_id: UUID,
        action_type: str,
        due_by: date,
        responsible_party: str,
        urgency: str,
        test_name: str | None = None,
        medication_id: UUID | None = None,
        for_appointment_id: UUID | None = None,
    ) -> GapAction:
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.gap_actions
              (patient_id, action_type, test_name, medication_id,
               for_appointment_id, due_by, responsible_party, urgency)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *
            """,
            patient_id, action_type, test_name, medication_id,
            for_appointment_id, due_by, responsible_party, urgency,
        )
        return GapAction.from_record(row)

    async def complete(self, action_id: UUID) -> None:
        await self.conn.execute(
            """
            UPDATE public.gap_actions
            SET status = 'completed', completed_at = now()
            WHERE id = $1
            """,
            action_id,
        )

    async def escalate(self, action_id: UUID) -> None:
        await self.conn.execute(
            """
            UPDATE public.gap_actions
            SET escalation_level = escalation_level + 1, last_escalation_at = now()
            WHERE id = $1 AND escalation_level < 5
            """,
            action_id,
        )
