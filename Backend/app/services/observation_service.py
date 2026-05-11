from __future__ import annotations

from uuid import UUID

import asyncpg

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.observation import Observation
from app.repositories.observation_repository import ObservationRepository
from app.schemas.observation import ObservationCreate


class ObservationService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._repo = ObservationRepository(conn)

    async def create(self, patient_id: UUID, data: ObservationCreate) -> Observation:
        return await self._repo.create(
            patient_id=patient_id,
            source_type=data.source_type,
            source_document_id=data.source_document_id,
            observation_date=data.observation_date,
            raw_transcript=data.raw_transcript,
            caregiver_id=data.caregiver_id,
            symptoms_reported=data.symptoms_reported,
            symptoms_denied=data.symptoms_denied,
            symptoms_absent=data.symptoms_absent,
            meals_eaten=data.meals_eaten,
            meal_notes=data.meal_notes,
            medications_taken=data.medications_taken,
            medication_timing_notes=data.medication_timing_notes,
            mobility_notes=data.mobility_notes,
            mood=data.mood,
            energy_level=data.energy_level,
            meera_mood_read=data.meera_mood_read,
            concerns_flagged=data.concerns_flagged,
        )

    async def list(
        self,
        patient_id: UUID,
        source_type: str | None = None,
        limit: int = 50,
    ) -> list[Observation]:
        return await self._repo.get_by_patient_id(
            patient_id, source_type=source_type, limit=limit
        )

    async def get(self, patient_id: UUID, obs_id: UUID) -> Observation:
        obs = await self._repo.get_by_id(obs_id)
        if not obs:
            raise NotFoundError("Observation", str(obs_id))
        if obs.patient_id != patient_id:
            raise ForbiddenError("Access denied to this observation")
        return obs
