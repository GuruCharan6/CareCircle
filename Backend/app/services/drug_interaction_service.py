from __future__ import annotations

from typing import List
from uuid import UUID

import asyncpg

from app.core.exceptions import NotFoundError
from app.models.drug_interaction_result import DrugInteractionResult
from app.repositories.drug_interaction_repository import DrugInteractionRepository


class DrugInteractionService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._conn = conn
        self._repo = DrugInteractionRepository(conn)

    async def list(self, patient_id: UUID) -> List[DrugInteractionResult]:
        return await self._repo.get_by_patient_id(patient_id)

    async def trigger_check(self, patient_id: UUID) -> List[DrugInteractionResult]:
        """Run drug pair check synchronously; return latest results."""
        await self._repo.delete_discontinued_for_patient(patient_id)
        from app.agents.drug_interaction_manager import DrugInteractionManager
        manager = DrugInteractionManager(self._conn)
        await manager.run(patient_id=patient_id)
        return await self._repo.get_by_patient_id(patient_id)

    async def dismiss(self, patient_id: UUID, interaction_id: UUID) -> None:
        """
        Dismiss a false-positive interaction: delete DB record + clear Redis cache.
        The pair will be re-checked fresh next time check_drug_interactions runs
        (cache miss → Gemini re-query without stale bias).
        """
        record = await self._repo.get_by_id(interaction_id)
        if not record or record.patient_id != patient_id:
            raise NotFoundError("DrugInteraction", str(interaction_id))

        # Clear Redis so next check hits Gemini fresh (not the stale cached result)
        from app.cache.drug_interaction_cache import clear_interaction
        await clear_interaction(record.drug_a_generic, record.drug_b_generic)

        await self._repo.delete_by_id(interaction_id)
