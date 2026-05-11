from datetime import datetime
from typing import Any
from uuid import UUID

from app.models.crisis_packet import CrisisPacket
from app.repositories.base import BaseRepository


class CrisisPacketRepository(BaseRepository):
    async def get_by_patient_id(self, patient_id: UUID) -> CrisisPacket | None:
        row = await self.conn.fetchrow(
            """
            SELECT * FROM public.crisis_packets
            WHERE patient_id = $1 AND is_current = true
            """,
            patient_id,
        )
        return CrisisPacket.from_record(row) if row else None

    async def upsert(
        self,
        *,
        patient_id: UUID,
        generated_at: datetime,
        rebuild_triggered_by: str,
        medications: list[Any],
        emergency_contacts: list[Any],
        last_cardiac_event: dict[str, Any] | None = None,
        nearest_emergency: dict[str, Any] | None = None,
        known_allergies: list[str] | None = None,
        blood_type: str | None = None,
        active_alerts: list[str] | None = None,
        known_conditions: list[str] | None = None,
        lab_results: list[Any] | None = None,
        prescribers: list[Any] | None = None,
        patient_name: str | None = None,
        patient_dob: str | None = None,
    ) -> CrisisPacket:
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.crisis_packets
              (patient_id, generated_at, rebuild_triggered_by,
               medications, last_cardiac_event, emergency_contacts,
               nearest_emergency, known_allergies, blood_type, active_alerts,
               known_conditions, lab_results, prescribers, is_current,
               patient_name, patient_dob)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,$14,$15)
            ON CONFLICT (patient_id) DO UPDATE SET
              generated_at         = EXCLUDED.generated_at,
              rebuild_triggered_by = EXCLUDED.rebuild_triggered_by,
              medications          = EXCLUDED.medications,
              last_cardiac_event   = EXCLUDED.last_cardiac_event,
              emergency_contacts   = EXCLUDED.emergency_contacts,
              nearest_emergency    = EXCLUDED.nearest_emergency,
              known_allergies      = EXCLUDED.known_allergies,
              blood_type           = EXCLUDED.blood_type,
              active_alerts        = EXCLUDED.active_alerts,
              known_conditions     = EXCLUDED.known_conditions,
              lab_results          = EXCLUDED.lab_results,
              prescribers          = EXCLUDED.prescribers,
              is_current           = true,
              updated_at           = now(),
              patient_name         = EXCLUDED.patient_name,
              patient_dob          = EXCLUDED.patient_dob
            RETURNING *
            """,
            patient_id, generated_at, rebuild_triggered_by,
            medications, last_cardiac_event, emergency_contacts,
            nearest_emergency, known_allergies or [], blood_type, active_alerts or [],
            known_conditions or [], lab_results or [], prescribers or [],
            patient_name, patient_dob,
        )
        return CrisisPacket.from_record(row)
