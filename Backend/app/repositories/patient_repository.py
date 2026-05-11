from datetime import date
from typing import Any
from uuid import UUID

from app.models.patient import Patient
from app.repositories.base import BaseRepository


class PatientRepository(BaseRepository):
    async def get_by_id(self, patient_id: UUID) -> Patient | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.patients WHERE id = $1", patient_id
        )
        return Patient.from_record(row) if row else None

    async def get_by_user_id(self, user_id: UUID) -> list[Patient]:
        rows = await self.conn.fetch(
            "SELECT * FROM public.patients WHERE user_id = $1 ORDER BY created_at ASC",
            user_id,
        )
        return [Patient.from_record(r) for r in rows]

    async def create(
        self,
        *,
        user_id: UUID,
        name: str,
        date_of_birth: date | None = None,
        gender: str | None = None,
        blood_type: str | None = None,
        known_conditions: list[str] | None = None,
        known_allergies: list[str] | None = None,
        primary_city: str | None = None,
        emergency_notes: str | None = None,
        emergency_contact_primary: dict[str, Any] | None = None,
        emergency_contact_secondary: dict[str, Any] | None = None,
        primary_physician: dict[str, Any] | None = None,
        nearest_hospital: dict[str, Any] | None = None,
    ) -> Patient:
        import json
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.patients
              (user_id, name, date_of_birth, gender, blood_type,
               known_conditions, known_allergies, primary_city, emergency_notes,
               emergency_contact_primary, emergency_contact_secondary,
               primary_physician, nearest_hospital)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            RETURNING *
            """,
            user_id, name, date_of_birth, gender, blood_type,
            known_conditions or [], known_allergies or [],
            primary_city, emergency_notes,
            json.dumps(emergency_contact_primary) if emergency_contact_primary else None,
            json.dumps(emergency_contact_secondary) if emergency_contact_secondary else None,
            json.dumps(primary_physician) if primary_physician else None,
            json.dumps(nearest_hospital) if nearest_hospital else None,
        )
        return Patient.from_record(row)

    async def update(
        self,
        patient_id: UUID,
        *,
        name: str | None = None,
        date_of_birth: date | None = None,
        gender: str | None = None,
        blood_type: str | None = None,
        known_conditions: list[str] | None = None,
        known_allergies: list[str] | None = None,
        primary_city: str | None = None,
        emergency_notes: str | None = None,
        emergency_contact_primary: dict[str, Any] | None = None,
        emergency_contact_secondary: dict[str, Any] | None = None,
        primary_physician: dict[str, Any] | None = None,
        nearest_hospital: dict[str, Any] | None = None,
    ) -> Patient | None:
        import json
        row = await self.conn.fetchrow(
            """
            UPDATE public.patients SET
              name                         = COALESCE($2, name),
              date_of_birth                = COALESCE($3, date_of_birth),
              gender                       = COALESCE($4, gender),
              blood_type                   = COALESCE($5, blood_type),
              known_conditions             = COALESCE($6, known_conditions),
              known_allergies              = COALESCE($7, known_allergies),
              primary_city                 = COALESCE($8, primary_city),
              emergency_notes              = COALESCE($9, emergency_notes),
              emergency_contact_primary    = COALESCE($10, emergency_contact_primary),
              emergency_contact_secondary  = COALESCE($11, emergency_contact_secondary),
              primary_physician            = COALESCE($12, primary_physician),
              nearest_hospital             = COALESCE($13, nearest_hospital),
              updated_at                   = now()
            WHERE id = $1
            RETURNING *
            """,
            patient_id, name, date_of_birth, gender, blood_type,
            known_conditions, known_allergies, primary_city, emergency_notes,
            json.dumps(emergency_contact_primary) if emergency_contact_primary else None,
            json.dumps(emergency_contact_secondary) if emergency_contact_secondary else None,
            json.dumps(primary_physician) if primary_physician else None,
            json.dumps(nearest_hospital) if nearest_hospital else None,
        )
        return Patient.from_record(row) if row else None

    async def delete(self, patient_id: UUID) -> bool:
        result = await self.conn.execute(
            "DELETE FROM public.patients WHERE id = $1", patient_id
        )
        return result == "DELETE 1"
