from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from app.models.drug_interaction_result import DrugInteractionResult
from app.repositories.base import BaseRepository


class DrugInteractionRepository(BaseRepository):
    async def get_by_id(self, result_id: UUID) -> DrugInteractionResult | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.drug_interaction_results WHERE id = $1", result_id
        )
        return DrugInteractionResult.from_record(row) if row else None

    async def get_by_patient_id(self, patient_id: UUID) -> list[DrugInteractionResult]:
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.drug_interaction_results
            WHERE patient_id = $1
              AND interaction IN ('confirmed', 'possible')
            ORDER BY checked_at DESC
            """,
            patient_id,
        )
        return [DrugInteractionResult.from_record(r) for r in rows]

    async def get_recent_pair(
        self,
        drug_a: str,
        drug_b: str,
        within_days: int = 30,
    ) -> DrugInteractionResult | None:
        """Cache lookup — avoid re-querying same pair within window."""
        cutoff = datetime.utcnow() - timedelta(days=within_days)
        # normalize pair order for consistent cache hit
        a, b = sorted([drug_a, drug_b])
        row = await self.conn.fetchrow(
            """
            SELECT * FROM public.drug_interaction_results
            WHERE drug_a_generic = $1
              AND drug_b_generic = $2
              AND checked_at > $3
            ORDER BY checked_at DESC
            LIMIT 1
            """,
            a, b, cutoff,
        )
        return DrugInteractionResult.from_record(row) if row else None

    async def create(
        self,
        *,
        patient_id: UUID,
        medication_a_id: UUID,
        medication_b_id: UUID,
        drug_a_generic: str,
        drug_b_generic: str,
        interaction: str,
        final_urgency: str,
        gemini_raw_response: dict[str, Any],
        severity: str | None = None,
        mechanism: str | None = None,
        gemini_confidence: str | None = None,
        gemini_note: str | None = None,
        lab_modifier_applied: bool = False,
    ) -> DrugInteractionResult:
        # normalize pair order
        a, b = sorted([drug_a_generic, drug_b_generic])
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.drug_interaction_results
              (patient_id, medication_a_id, medication_b_id,
               drug_a_generic, drug_b_generic, interaction, severity,
               mechanism, gemini_confidence, gemini_note,
               gemini_raw_response, lab_modifier_applied, final_urgency)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            RETURNING *
            """,
            patient_id, medication_a_id, medication_b_id,
            a, b, interaction, severity,
            mechanism, gemini_confidence, gemini_note,
            gemini_raw_response, lab_modifier_applied, final_urgency,
        )
        return DrugInteractionResult.from_record(row)

    async def mark_notification_sent(self, result_id: UUID) -> None:
        await self.conn.execute(
            "UPDATE public.drug_interaction_results SET notification_sent = true WHERE id = $1",
            result_id,
        )
