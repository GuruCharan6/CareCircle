from datetime import date
from uuid import UUID

from app.models.patient_state import PatientState
from app.repositories.base import BaseRepository


class PatientStateRepository(BaseRepository):
    async def get_by_patient_id(self, patient_id: UUID) -> PatientState | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.patient_state WHERE patient_id = $1", patient_id
        )
        return PatientState.from_record(row) if row else None

    async def upsert(
        self,
        *,
        patient_id: UUID,
        overall_status: str,
        biochemical_confidence: str = "unknown",
        behavioral_confidence: str = "unknown",
        subjective_confidence: str = "unknown",
        clinical_confidence: str = "unknown",
        last_lab_date: date | None = None,
        last_caregiver_note_date: date | None = None,
        last_meera_log_date: date | None = None,
        last_prescription_date: date | None = None,
        active_medication_count: int = 0,
        active_alerts_count: int = 0,
        active_watch_count: int = 0,
        active_conflicts_count: int = 0,
        staleness_status: str = "unknown",
        last_digest_summary: str | None = None,
    ) -> PatientState:
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.patient_state
              (patient_id, overall_status,
               biochemical_confidence, behavioral_confidence,
               subjective_confidence, clinical_confidence,
               last_lab_date, last_caregiver_note_date,
               last_meera_log_date, last_prescription_date,
               active_medication_count, active_alerts_count,
               active_watch_count, active_conflicts_count,
               staleness_status, last_digest_summary, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now())
            ON CONFLICT (patient_id) DO UPDATE SET
              overall_status         = EXCLUDED.overall_status,
              biochemical_confidence = EXCLUDED.biochemical_confidence,
              behavioral_confidence  = EXCLUDED.behavioral_confidence,
              subjective_confidence  = EXCLUDED.subjective_confidence,
              clinical_confidence    = EXCLUDED.clinical_confidence,
              last_lab_date          = COALESCE(EXCLUDED.last_lab_date, patient_state.last_lab_date),
              last_caregiver_note_date = COALESCE(EXCLUDED.last_caregiver_note_date, patient_state.last_caregiver_note_date),
              last_meera_log_date    = COALESCE(EXCLUDED.last_meera_log_date, patient_state.last_meera_log_date),
              last_prescription_date = COALESCE(EXCLUDED.last_prescription_date, patient_state.last_prescription_date),
              active_medication_count = EXCLUDED.active_medication_count,
              active_alerts_count    = EXCLUDED.active_alerts_count,
              active_watch_count     = EXCLUDED.active_watch_count,
              active_conflicts_count = EXCLUDED.active_conflicts_count,
              staleness_status       = EXCLUDED.staleness_status,
              last_digest_summary    = COALESCE(EXCLUDED.last_digest_summary, patient_state.last_digest_summary),
              updated_at             = now()
            RETURNING *
            """,
            patient_id, overall_status,
            biochemical_confidence, behavioral_confidence,
            subjective_confidence, clinical_confidence,
            last_lab_date, last_caregiver_note_date,
            last_meera_log_date, last_prescription_date,
            active_medication_count, active_alerts_count,
            active_watch_count, active_conflicts_count,
            staleness_status, last_digest_summary,
        )
        return PatientState.from_record(row)
