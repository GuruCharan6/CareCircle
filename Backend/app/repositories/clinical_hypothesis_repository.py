from typing import Any
from uuid import UUID

from app.models.clinical_hypothesis import ClinicalHypothesis
from app.repositories.base import BaseRepository


class ClinicalHypothesisRepository(BaseRepository):
    async def get_by_id(self, hyp_id: UUID) -> ClinicalHypothesis | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.clinical_hypotheses WHERE id = $1", hyp_id
        )
        return ClinicalHypothesis.from_record(row) if row else None

    async def get_active_by_patient(self, patient_id: UUID) -> list[ClinicalHypothesis]:
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.clinical_hypotheses
            WHERE patient_id = $1 AND status = 'active'
            ORDER BY created_at DESC
            """,
            patient_id,
        )
        return [ClinicalHypothesis.from_record(r) for r in rows]

    async def get_by_urgency(
        self, patient_id: UUID, urgency: str
    ) -> list[ClinicalHypothesis]:
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.clinical_hypotheses
            WHERE patient_id = $1 AND urgency = $2 AND status = 'active'
            ORDER BY created_at DESC
            """,
            patient_id, urgency,
        )
        return [ClinicalHypothesis.from_record(r) for r in rows]

    async def create(
        self,
        *,
        patient_id: UUID,
        rule_id: str,
        trigger_event_type: str,
        trigger_event_id: UUID,
        hypothesis_text: str,
        confidence: str,
        urgency: str,
        supporting_evidence: list[Any] | None = None,
    ) -> ClinicalHypothesis:
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.clinical_hypotheses
              (patient_id, rule_id, trigger_event_type, trigger_event_id,
               hypothesis_text, confidence, urgency, supporting_evidence)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *
            """,
            patient_id, rule_id, trigger_event_type, trigger_event_id,
            hypothesis_text, confidence, urgency, supporting_evidence or [],
        )
        return ClinicalHypothesis.from_record(row)

    async def resolve(self, hyp_id: UUID) -> None:
        await self.conn.execute(
            """
            UPDATE public.clinical_hypotheses
            SET status = 'resolved', resolved_at = now()
            WHERE id = $1
            """,
            hyp_id,
        )

    async def dismiss(self, hyp_id: UUID, dismissed_by: UUID) -> None:
        await self.conn.execute(
            """
            UPDATE public.clinical_hypotheses
            SET status = 'dismissed', dismissed_by = $2
            WHERE id = $1
            """,
            hyp_id, dismissed_by,
        )
