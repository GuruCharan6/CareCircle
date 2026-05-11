from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

import asyncpg

from app.config import settings
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.core.supabase import supabase_admin
from app.lib.pdf_generator import generate_doctor_briefing_pdf, generate_medication_list_pdf
from app.lib.signed_url import create_signed_view_url
from app.repositories.calendar_event_repository import CalendarEventRepository
from app.repositories.drug_interaction_repository import DrugInteractionRepository
from app.repositories.lab_result_repository import LabResultRepository
from app.repositories.medication_repository import MedicationRepository
from app.repositories.observation_repository import ObservationRepository
from app.repositories.patient_repository import PatientRepository

logger = get_logger(__name__)

_BRIEFING_URL_EXPIRY = 86400  # 24hr — patient generates night before, shows doctor next day

_INTERACTION_Q = "Is {drug_a} + {drug_b} safe for this patient?"
_LAB_TREND_Q = "{test} trending {direction} — dose review needed?"
_TIMING_Q = "Metformin dose timing — is before meals causing elevated glucose?"
_RENAL_Q = "Borderline creatinine ({value}) — any dose adjustment needed?"
_ADHERENCE_Q = "Patient took only {pct}% of recorded doses recently — is treatment plan realistic?"
_ALLERGY_Q = "Patient allergic to: {allergies} — confirm no current medications interact."


class DoctorBriefingService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._conn = conn
        self._patient_repo = PatientRepository(conn)
        self._med_repo = MedicationRepository(conn)
        self._lab_repo = LabResultRepository(conn)
        self._cal_repo = CalendarEventRepository(conn)
        self._obs_repo = ObservationRepository(conn)
        self._interaction_repo = DrugInteractionRepository(conn)

    async def get_briefing(self, patient_id: UUID, event_id: UUID) -> dict:
        patient = await self._patient_repo.get_by_id(patient_id)
        if not patient:
            raise NotFoundError("Patient", str(patient_id))

        event = await self._cal_repo.get_by_id(event_id)
        if not event or event.patient_id != patient_id:
            raise NotFoundError("CalendarEvent", str(event_id))

        specialist = event.specialist_type or "general"
        all_meds = await self._med_repo.get_active_by_patient(patient_id)

        interactions = await self._interaction_repo.get_by_patient_id(patient_id)
        flagged_pairs: dict[str, list[str]] = {}  # generic_name → [pair strings]
        for ix in interactions:
            if ix.interaction in ("confirmed", "possible") and ix.final_urgency in ("alert", "watch"):
                pair_label = f"{ix.drug_a_generic} + {ix.drug_b_generic}"
                for drug in (ix.drug_a_generic, ix.drug_b_generic):
                    flagged_pairs.setdefault(drug, []).append(pair_label)

        meds_other = [
            m for m in all_meds
            if m.prescriber_specialty and m.prescriber_specialty.lower() != specialist.lower()
        ]
        meds_other += [m for m in all_meds if not m.prescriber_specialty]

        meds_other_dicts = []
        for m in meds_other:
            pairs = flagged_pairs.get(m.generic_name, [])
            meds_other_dicts.append({
                "brand_name": m.brand_name,
                "generic_name": m.generic_name,
                "dose": m.dose,
                "frequency": m.frequency,
                "timing": m.timing,
                "prescriber_name": m.prescriber_name,
                "prescriber_specialty": m.prescriber_specialty,
                "prescribed_date": m.prescribed_date,
                "interaction_flag": bool(pairs),
                "interaction_pairs": pairs,  # specific pairs, not just bool
            })

        lab_trends = await self._build_lab_trends(patient_id)

        # Fix: source_type values must match observation_repository normalization
        obs_caregiver = await self._obs_repo.get_by_patient_id(
            patient_id, source_type="caregiver_note", limit=3
        )
        obs_meera = await self._obs_repo.get_by_patient_id(
            patient_id, source_type="voice_log", limit=2
        )
        behavioral_notes: list[str] = []
        for o in obs_caregiver:
            if o.symptoms_reported:
                behavioral_notes.append(
                    f"Caregiver ({o.observation_date}): reported {', '.join(o.symptoms_reported)}"
                )
            if o.medications_taken is False:
                behavioral_notes.append(f"Caregiver ({o.observation_date}): medication NOT taken")
            if o.meal_notes:
                behavioral_notes.append(f"Caregiver ({o.observation_date}): {o.meal_notes}")
        for o in obs_meera:
            if o.symptoms_absent:
                behavioral_notes.append(
                    f"Meera noted ABSENT ({o.observation_date}): {', '.join(o.symptoms_absent)}"
                )
            if o.concerns_flagged:
                behavioral_notes.append(
                    f"Meera concern ({o.observation_date}): {', '.join(o.concerns_flagged)}"
                )

        adherence = await self._compute_adherence(patient_id)

        questions = self._build_questions(
            interactions=interactions,
            lab_trends=lab_trends,
            meds=all_meds,
            adherence=adherence,
            allergies=patient.known_allergies,
        )

        return {
            "patient_name": patient.name,
            "appointment_title": event.title,
            "appointment_date": str(event.event_date),
            "specialist": specialist,
            "allergies": patient.known_allergies,
            "known_conditions": patient.known_conditions,
            "meds_from_other_doctors": meds_other_dicts,
            "lab_trends": lab_trends,
            "behavioral_notes": behavioral_notes,
            "adherence": adherence,
            "questions_to_raise": questions,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    async def generate_medication_list_pdf_url(self, patient_id: UUID) -> str:
        patient = await self._patient_repo.get_by_id(patient_id)
        if not patient:
            raise NotFoundError("Patient", str(patient_id))

        meds = await self._med_repo.get_active_by_patient(patient_id)
        interactions = await self._interaction_repo.get_by_patient_id(patient_id)

        flagged = [
            {
                "drug_a": ix.drug_a_generic,
                "drug_b": ix.drug_b_generic,
                "severity": ix.severity,
                "mechanism": ix.mechanism,
            }
            for ix in interactions
            if ix.interaction in ("confirmed", "possible") and ix.final_urgency in ("alert", "watch")
        ]

        med_dicts = [
            {
                "brand_name": m.brand_name,
                "generic_name": m.generic_name,
                "dose": m.dose,
                "frequency": m.frequency,
                "timing": m.timing,
                "prescriber_name": m.prescriber_name,
                "prescriber_specialty": m.prescriber_specialty,
                "prescribed_date": m.prescribed_date,
            }
            for m in meds
        ]

        pdf_bytes = generate_medication_list_pdf(
            patient_name=patient.name,
            medications=med_dicts,
            interactions=flagged,
        )

        now_ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        path = f"{patient_id}/medlist_{now_ts}.pdf"
        bucket = settings.supabase_storage_bucket_documents

        supabase_admin.storage.from_(bucket).upload(
            path, pdf_bytes, {"content-type": "application/pdf", "upsert": "true"},
        )
        return create_signed_view_url(bucket, path)

    async def generate_briefing_pdf_url(self, patient_id: UUID, event_id: UUID) -> str:
        briefing = await self.get_briefing(patient_id, event_id)

        pdf_bytes = generate_doctor_briefing_pdf(
            patient_name=briefing["patient_name"],
            appointment_title=briefing["appointment_title"],
            appointment_date=briefing["appointment_date"],
            specialist=briefing["specialist"],
            medications_other_doctors=briefing["meds_from_other_doctors"],
            lab_trends=briefing["lab_trends"],
            behavioral_notes=briefing["behavioral_notes"],
            questions_to_raise=briefing["questions_to_raise"],
            allergies=briefing["allergies"],
            known_conditions=briefing["known_conditions"],
            adherence=briefing["adherence"],
        )

        now_ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        path = f"{patient_id}/briefing_{event_id}_{now_ts}.pdf"
        bucket = settings.supabase_storage_bucket_documents

        supabase_admin.storage.from_(bucket).upload(
            path, pdf_bytes, {"content-type": "application/pdf", "upsert": "true"},
        )
        return create_signed_view_url(bucket, path, expires_in=_BRIEFING_URL_EXPIRY)

    # ── Helpers ────────────────────────────────────────────────────────────────

    async def _build_lab_trends(self, patient_id: UUID) -> list[dict]:
        key_tests = ["HbA1c", "Fasting Glucose", "Serum Creatinine", "LDL", "Hemoglobin"]
        trends = []
        for test in key_tests:
            readings = await self._lab_repo.get_trend(patient_id, test, limit=3)
            if not readings:
                continue
            latest = readings[0]
            if len(readings) >= 2:
                try:
                    if latest.value is not None and readings[-1].value is not None:
                        latest_val = float(latest.value)
                        oldest_val = float(readings[-1].value)
                        if latest_val > oldest_val * 1.05:
                            raw_dir = "up"
                        elif latest_val < oldest_val * 0.95:
                            raw_dir = "down"
                        else:
                            raw_dir = "stable"
                    else:
                        raw_dir = "stable"
                except (ValueError, TypeError):
                    raw_dir = "stable"
            else:
                raw_dir = "stable"

            direction_map = {"up": "worsening", "down": "improving", "stable": "stable"}
            direction = direction_map.get(raw_dir, "stable")

            trends.append({
                "test_name_display": test,
                "direction": direction,
                "latest_value": str(latest.value),
                "unit": latest.unit or "",
                "is_abnormal": bool(latest.is_abnormal),
            })
        return trends

    async def _compute_adherence(self, patient_id: UUID) -> dict | None:
        obs = await self._obs_repo.get_by_patient_id(
            patient_id, source_type="caregiver_note", limit=30
        )
        tracked = [o for o in obs if o.medications_taken is not None]
        if not tracked:
            return None
        taken = sum(1 for o in tracked if o.medications_taken)
        pct = round(taken / len(tracked) * 100)
        return {"pct": pct, "of": len(tracked)}

    def _build_questions(
        self,
        interactions,
        lab_trends,
        meds,
        adherence: dict | None,
        allergies: list[str],
    ) -> list[str]:
        questions: list[str] = []

        seen_pairs: set[tuple[str, str]] = set()
        for ix in interactions:
            if ix.interaction in ("confirmed", "possible") and ix.final_urgency in ("alert", "watch"):
                pair = (ix.drug_a_generic, ix.drug_b_generic)
                if pair not in seen_pairs:
                    questions.append(
                        _INTERACTION_Q.format(drug_a=ix.drug_a_generic, drug_b=ix.drug_b_generic)
                    )
                    seen_pairs.add(pair)

        for trend in lab_trends:
            direction = trend.get("direction", "")
            is_abnormal = trend.get("is_abnormal", False)
            test_name = trend.get("test_name_display", "")

            if direction == "worsening" and is_abnormal:
                questions.append(
                    _LAB_TREND_Q.format(test=test_name, direction="up")
                )

            if test_name == "Serum Creatinine" and is_abnormal:
                latest_val = trend.get("latest_value")
                try:
                    if latest_val and float(latest_val) >= 1.4:
                        questions.append(_RENAL_Q.format(value=latest_val))
                except (ValueError, TypeError):
                    pass

        for m in meds:
            if "metformin" in m.generic_name.lower():
                if m.timing and "after" not in m.timing.lower():
                    questions.append(_TIMING_Q)
                break

        if adherence and adherence["pct"] < 70:
            questions.append(_ADHERENCE_Q.format(pct=adherence["pct"]))

        if allergies:
            questions.append(_ALLERGY_Q.format(allergies=", ".join(allergies)))

        return questions[:8]
