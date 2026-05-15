from __future__ import annotations

from typing import List
from uuid import UUID

import asyncpg

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
