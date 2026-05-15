from datetime import date, timedelta
from typing import Any
from uuid import UUID

from app.models.observation import Observation
from app.repositories.base import BaseRepository


class ObservationRepository(BaseRepository):
    async def get_by_patient_id(
        self,
        patient_id: UUID,
        source_type: str | None = None,
        limit: int = 50,
    ) -> list[Observation]:
        # source_type normalization:
        #   DB observations table stores 'voice_note_caregiver' / 'voice_note_meera' (pipeline values)
        #   Frontend filter tabs use 'caregiver_note' / 'voice_log'
        base_query = """
            SELECT
                o.id, o.patient_id,
                CASE o.source_type
                    WHEN 'caregiver_voice'      THEN 'caregiver_note'
                    WHEN 'voice_note_caregiver' THEN 'caregiver_note'
                    WHEN 'meera_call_log'       THEN 'voice_log'
                    WHEN 'voice_note_meera'     THEN 'voice_log'
                    ELSE o.source_type
                END as source_type,
                o.caregiver_id, o.source_document_id,
                o.observation_date, o.raw_transcript, o.created_at,
                o.symptoms_reported, o.symptoms_denied, o.symptoms_absent,
                o.meals_eaten, o.meal_notes, o.medications_taken, o.medication_timing_notes,
                o.mobility_notes, o.mood, o.energy_level, o.meera_mood_read, o.concerns_flagged,
                d.file_url as source_document_url,
                c.name as caregiver_name
            FROM public.observations o
            LEFT JOIN public.source_documents d ON o.source_document_id = d.id
            LEFT JOIN public.caregivers c ON o.caregiver_id = c.id
            WHERE o.patient_id = $1
        """

        if source_type:
            normalized = {
                "caregiver_voice": "caregiver_note",
                "voice_note_caregiver": "caregiver_note",
                "meera_call_log": "voice_log",
                "voice_note_meera": "voice_log",
            }.get(source_type, source_type)
            rows = await self.conn.fetch(
                base_query + """
                AND CASE o.source_type
                    WHEN 'caregiver_voice'      THEN 'caregiver_note'
                    WHEN 'voice_note_caregiver' THEN 'caregiver_note'
                    WHEN 'meera_call_log'       THEN 'voice_log'
                    WHEN 'voice_note_meera'     THEN 'voice_log'
                    ELSE o.source_type
                END = $2
                ORDER BY o.observation_date DESC, o.created_at DESC LIMIT $3
                """,
                patient_id, normalized, limit,
            )
        else:
            rows = await self.conn.fetch(
                base_query + " ORDER BY o.observation_date DESC, o.created_at DESC LIMIT $2",
                patient_id, limit,
            )

        return [await self._process_row(r) for r in rows]

    async def _process_row(self, row: dict[str, Any]) -> Observation:
        obs = Observation.from_record(row)
        if row.get("source_document_url"):
            try:
                from app.lib.signed_url import create_signed_view_url
                from app.config import settings
                bucket = settings.supabase_storage_bucket_documents
                obs.source_document_url = create_signed_view_url(bucket, row["source_document_url"])
            except Exception as e:
                from app.core.logging import get_logger
                logger = get_logger(__name__)
                logger.error("observation_repo.audio_link_failed", error=str(e), path=row["source_document_url"])
                obs.source_document_url = None
        return obs

    async def get_recent_caregiver(
        self,
        patient_id: UUID,
        within_days: int = 2,
        limit: int = 5,
    ) -> list[Observation]:
        cutoff = date.today() - timedelta(days=within_days)
        rows = await self.conn.fetch(
            """
            SELECT
                o.id, o.patient_id,
                CASE o.source_type
                    WHEN 'caregiver_voice'      THEN 'caregiver_note'
                    WHEN 'voice_note_caregiver' THEN 'caregiver_note'
                    WHEN 'meera_call_log'       THEN 'voice_log'
                    WHEN 'voice_note_meera'     THEN 'voice_log'
                    ELSE o.source_type
                END as source_type,
                o.caregiver_id, o.source_document_id,
                o.observation_date, o.raw_transcript, o.created_at,
                o.symptoms_reported, o.symptoms_denied, o.symptoms_absent,
                o.meals_eaten, o.meal_notes, o.medications_taken, o.medication_timing_notes,
                o.mobility_notes, o.mood, o.energy_level, o.meera_mood_read, o.concerns_flagged,
                d.file_url as source_document_url,
                c.name as caregiver_name
            FROM public.observations o
            LEFT JOIN public.source_documents d ON o.source_document_id = d.id
            LEFT JOIN public.caregivers c ON o.caregiver_id = c.id
            WHERE o.patient_id = $1
              AND o.observation_date >= $2
              AND o.source_type IN (
                'caregiver_voice', 'voice_note_caregiver', 'caregiver_note',
                'meera_call_log', 'voice_note_meera', 'voice_log'
              )
            ORDER BY o.created_at DESC
            LIMIT $3
            """,
            patient_id, cutoff, limit,
        )
        return [Observation.from_record(r) for r in rows]

    async def get_by_id(self, obs_id: UUID) -> Observation | None:
        row = await self.conn.fetchrow(
            """
            SELECT o.*, d.file_url as source_document_url, c.name as caregiver_name
            FROM public.observations o
            LEFT JOIN public.source_documents d ON o.source_document_id = d.id
            LEFT JOIN public.caregivers c ON o.caregiver_id = c.id
            WHERE o.id = $1
            """,
            obs_id
        )
        return await self._process_row(row) if row else None

    async def get_latest(self, patient_id: UUID, source_type: str) -> Observation | None:
        row = await self.conn.fetchrow(
            """
            SELECT * FROM public.observations
            WHERE patient_id = $1
              AND CASE source_type
                    WHEN 'caregiver_voice'      THEN 'caregiver_note'
                    WHEN 'voice_note_caregiver' THEN 'caregiver_note'
                    WHEN 'meera_call_log'       THEN 'voice_log'
                    WHEN 'voice_note_meera'     THEN 'voice_log'
                    ELSE source_type
                  END = $2
            ORDER BY observation_date DESC
            LIMIT 1
            """,
            patient_id, source_type,
        )
        return Observation.from_record(row) if row else None

    async def create(
        self,
        *,
        patient_id: UUID,
        source_type: str,
        source_document_id: UUID | None,
        observation_date: date,
        raw_transcript: str | None,
        caregiver_id: UUID | None = None,
        symptoms_reported: list[str] | None = None,
        symptoms_denied: list[str] | None = None,
        symptoms_absent: list[str] | None = None,
        meals_eaten: dict[str, Any] | None = None,
        meal_notes: str | None = None,
        medications_taken: bool | None = None,
        medication_timing_notes: str | None = None,
        mobility_notes: str | None = None,
        mood: str | None = None,
        energy_level: str | None = None,
        meera_mood_read: str | None = None,
        concerns_flagged: list[str] | None = None,
    ) -> Observation:
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.observations
              (patient_id, source_type, caregiver_id, source_document_id,
               observation_date, raw_transcript,
               symptoms_reported, symptoms_denied, symptoms_absent,
               meals_eaten, meal_notes, medications_taken, medication_timing_notes,
               mobility_notes, mood, energy_level, meera_mood_read, concerns_flagged)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
            RETURNING *
            """,
            patient_id, source_type, caregiver_id, source_document_id,
            observation_date, raw_transcript,
            symptoms_reported or [], symptoms_denied or [], symptoms_absent or [],
            meals_eaten, meal_notes, medications_taken, medication_timing_notes,
            mobility_notes, mood, energy_level, meera_mood_read, concerns_flagged or [],
        )
        return Observation.from_record(row)
