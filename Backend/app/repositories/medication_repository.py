from __future__ import annotations

from datetime import date
from uuid import UUID

from app.models.medication import Medication
from app.repositories.base import BaseRepository

# Reusable SELECT fragment — joins drug_generic_lookup to get body_systems.
# LATERAL subquery avoids duplicate rows when multiple brands share a generic name.
_SELECT_WITH_SYSTEMS = """
    SELECT m.*,
        COALESCE(
            (SELECT d.body_systems
             FROM public.drug_generic_lookup d
             WHERE LOWER(d.generic_name) = LOWER(m.generic_name)
             LIMIT 1),
            '{}'::text[]
        ) AS body_systems
    FROM public.medications m
"""


class MedicationRepository(BaseRepository):
    async def get_by_id(self, medication_id: UUID) -> Medication | None:
        row = await self.conn.fetchrow(
            _SELECT_WITH_SYSTEMS + "WHERE m.id = $1",
            medication_id,
        )
        return Medication.from_record(row) if row else None

    async def get_active_by_patient(self, patient_id: UUID) -> list[Medication]:
        rows = await self.conn.fetch(
            _SELECT_WITH_SYSTEMS + """
            WHERE m.patient_id = $1 AND m.status = 'active'
            ORDER BY m.created_at DESC
            """,
            patient_id,
        )
        return [Medication.from_record(r) for r in rows]

    async def get_by_patient_id(self, patient_id: UUID) -> list[Medication]:
        rows = await self.conn.fetch(
            _SELECT_WITH_SYSTEMS + """
            WHERE m.patient_id = $1
            ORDER BY m.created_at DESC
            """,
            patient_id,
        )
        return [Medication.from_record(r) for r in rows]

    async def get_by_generic_name(
        self, patient_id: UUID, generic_name: str, status: str = "active"
    ) -> list[Medication]:
        rows = await self.conn.fetch(
            _SELECT_WITH_SYSTEMS + """
            WHERE m.patient_id = $1 AND m.generic_name = $2 AND m.status = $3
            """,
            patient_id, generic_name, status,
        )
        return [Medication.from_record(r) for r in rows]

    async def create(
        self,
        *,
        patient_id: UUID,
        source_document_id: UUID,
        generic_name: str,
        dose: str,
        frequency: str,
        valid_from: date,
        brand_name: str | None = None,
        drug_class: str | None = None,
        timing: str | None = None,
        timing_slots: list[str] | None = None,
        prescriber_id: UUID | None = None,
        prescriber_name: str | None = None,
        prescriber_specialty: str | None = None,
        prescriber_hospital: str | None = None,
        prescribed_date: date | None = None,
        valid_until: date | None = None,
        notes: str | None = None,
    ) -> Medication:
        # CTE: insert then join body_systems in one round-trip
        row = await self.conn.fetchrow(
            """
            WITH inserted AS (
                INSERT INTO public.medications
                  (patient_id, source_document_id, brand_name, generic_name, drug_class,
                   dose, frequency, timing, timing_slots, prescriber_id,
                   prescriber_name, prescriber_specialty, prescriber_hospital,
                   prescribed_date, valid_from, valid_until, notes)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
                RETURNING *
            )
            SELECT i.*,
                COALESCE(
                    (SELECT d.body_systems
                     FROM public.drug_generic_lookup d
                     WHERE LOWER(d.generic_name) = LOWER(i.generic_name)
                     LIMIT 1),
                    '{}'::text[]
                ) AS body_systems
            FROM inserted i
            """,
            patient_id, source_document_id, brand_name, generic_name, drug_class,
            dose, frequency, timing, timing_slots or [], prescriber_id,
            prescriber_name, prescriber_specialty, prescriber_hospital,
            prescribed_date, valid_from, valid_until, notes,
        )
        return Medication.from_record(row)

    async def update(
        self,
        medication_id: UUID,
        *,
        brand_name: str | None = None,
        generic_name: str | None = None,
        drug_class: str | None = None,
        dose: str | None = None,
        frequency: str | None = None,
        timing: str | None = None,
        timing_slots: list[str] | None = None,
        prescriber_id: UUID | None = None,
        prescriber_name: str | None = None,
        prescriber_specialty: str | None = None,
        prescriber_hospital: str | None = None,
        prescribed_date: date | None = None,
        notes: str | None = None,
    ) -> Medication | None:
        """Partial update — only non-None fields are changed.
        timing_slots=[] clears all slots (empty array ≠ None).
        timing_slots=None means no change to existing value.
        COALESCE handles None→skip, non-None (including [])→override.
        """
        row = await self.conn.fetchrow(
            """
            WITH updated AS (
                UPDATE public.medications SET
                    brand_name           = COALESCE($2,  brand_name),
                    generic_name         = COALESCE($3,  generic_name),
                    drug_class           = COALESCE($4,  drug_class),
                    dose                 = COALESCE($5,  dose),
                    frequency            = COALESCE($6,  frequency),
                    timing               = COALESCE($7,  timing),
                    prescriber_id        = COALESCE($8,  prescriber_id),
                    prescriber_name      = COALESCE($9,  prescriber_name),
                    timing_slots         = COALESCE($10, timing_slots),
                    prescriber_specialty = COALESCE($11, prescriber_specialty),
                    prescriber_hospital  = COALESCE($12, prescriber_hospital),
                    prescribed_date      = COALESCE($13, prescribed_date),
                    notes                = COALESCE($14, notes)
                WHERE id = $1
                RETURNING *
            )
            SELECT u.*,
                COALESCE(
                    (SELECT d.body_systems
                     FROM public.drug_generic_lookup d
                     WHERE LOWER(d.generic_name) = LOWER(u.generic_name)
                     LIMIT 1),
                    '{}'::text[]
                ) AS body_systems
            FROM updated u
            """,
            medication_id, brand_name, generic_name, drug_class, dose, frequency,
            timing, prescriber_id, prescriber_name, timing_slots,
            prescriber_specialty, prescriber_hospital, prescribed_date, notes,
        )
        return Medication.from_record(row) if row else None

    async def supersede(self, old_id: UUID, new_id: UUID) -> None:
        """Mark old medication as superseded by new one."""
        await self.conn.execute(
            """
            UPDATE public.medications
            SET status = 'superseded', superseded_by = $2, valid_until = now()::date
            WHERE id = $1
            """,
            old_id, new_id,
        )

    async def discontinue(self, medication_id: UUID) -> None:
        await self.conn.execute(
            "UPDATE public.medications SET status = 'discontinued' WHERE id = $1",
            medication_id,
        )

    async def get_by_document(self, document_id: UUID) -> list[Medication]:
        rows = await self.conn.fetch(
            _SELECT_WITH_SYSTEMS + " WHERE m.source_document_id = $1",
            document_id,
        )
        return [Medication.from_record(r) for r in rows]
