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
            SELECT dir.*
            FROM public.drug_interaction_results dir
            JOIN public.medications ma ON dir.medication_a_id = ma.id
            JOIN public.medications mb ON dir.medication_b_id = mb.id
            WHERE dir.patient_id = $1
              AND dir.interaction IN ('confirmed', 'possible')
              AND ma.status = 'active'
              AND mb.status = 'active'
            ORDER BY dir.checked_at DESC
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

    async def delete_discontinued_for_patient(self, patient_id: UUID) -> int:
        """Delete interaction records where either medication is no longer active."""
        result = await self.conn.execute(
            """
            DELETE FROM public.drug_interaction_results dir
            USING public.medications ma, public.medications mb
            WHERE dir.medication_a_id = ma.id
              AND dir.medication_b_id = mb.id
              AND dir.patient_id = $1
              AND (ma.status != 'active' OR mb.status != 'active')
            """,
            patient_id,
        )
        return int(result.split()[-1])

    async def delete_by_medication_id(self, medication_id: UUID) -> int:
        result = await self.conn.execute(
            """
            DELETE FROM public.drug_interaction_results
            WHERE medication_a_id = $1 OR medication_b_id = $1
            """,
            medication_id,
        )
        return int(result.split()[-1])

    async def delete_by_id(self, result_id: UUID) -> bool:
        result = await self.conn.execute(
            "DELETE FROM public.drug_interaction_results WHERE id = $1", result_id
        )
        return result == "DELETE 1"

    async def mark_notification_sent(self, result_id: UUID) -> None:
        await self.conn.execute(
            "UPDATE public.drug_interaction_results SET notification_sent = true WHERE id = $1",
            result_id,
        )
