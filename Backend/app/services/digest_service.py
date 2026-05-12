from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import UUID

import asyncpg

from app.core.exceptions import NotFoundError
from app.lib.upload_jwt import create_upload_jwt
from app.repositories.calendar_event_repository import CalendarEventRepository
from app.repositories.clinical_hypothesis_repository import ClinicalHypothesisRepository
from app.repositories.medication_refill_repository import MedicationRefillRepository
from app.repositories.medication_repository import MedicationRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.patient_state_repository import PatientStateRepository
from app.repositories.user_repository import UserRepository
from app.schemas.calendar import CalendarEventListItem
from app.schemas.digest import DigestPreferencesUpdate, DigestRefillAlert, DigestResponse


class DigestService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._patient_repo = PatientRepository(conn)
        self._state_repo = PatientStateRepository(conn)
        self._calendar_repo = CalendarEventRepository(conn)
        self._refill_repo = MedicationRefillRepository(conn)
        self._med_repo = MedicationRepository(conn)
        self._hyp_repo = ClinicalHypothesisRepository(conn)
        self._user_repo = UserRepository(conn)

    async def build(
        self,
        patient_id: UUID,
        user_id: UUID,
        period: str = "morning",
    ) -> DigestResponse:
        patient = await self._patient_repo.get_by_id(patient_id)
        if not patient:
            raise NotFoundError("Patient", str(patient_id))

        state = await self._state_repo.get_by_patient_id(patient_id)
        overall_status = state.overall_status if state else "unknown"
        if state and state.last_digest_summary:
            today_summary = state.last_digest_summary
        else:
            # Fallback for new patients or before first digest/pipeline run
            if overall_status == "ok":
                today_summary = "System monitoring active. No urgent concerns at this time."
            elif overall_status == "alert":
                today_summary = "Health alert detected. Review the details below for necessary actions."
            elif overall_status == "watch":
                today_summary = "New health observations recorded. Monitoring for any changes."
            else:
                today_summary = "Gathering patient data..."

        # Upcoming events: 30-day window for system-wide consistency
        days_window = 30
        events = await self._calendar_repo.get_upcoming(patient_id, within_days=days_window)
        upcoming = [
            CalendarEventListItem(
                id=e.id,
                event_type=e.event_type,
                title=e.title,
                event_date=e.event_date,
                event_time=e.event_time,
                status=e.status,
                tests_pending=sum(
                    1 for s in e.tests_status.values() if s == "pending"
                ) if e.tests_status else 0,
                days_until=(e.event_date - date.today()).days,
            )
            for e in events[:3]
        ]

        # Refill alerts
        today = date.today()
        # Refill alerts: 30-day window system-wide
        refills_due = await self._refill_repo.get_due_soon(patient_id, within_days=30)
        refill_alerts = []
        for refill in refills_due:
            med = await self._med_repo.get_by_id(refill.medication_id)
            days_remaining = (refill.refill_due_date - today).days
            urgency = "alert" if days_remaining <= 3 else "watch"
            refill_alerts.append(
                DigestRefillAlert(
                    medication_id=refill.medication_id,
                    generic_name=med.generic_name if med else "Unknown",
                    brand_name=med.brand_name if med else None,
                    days_remaining=days_remaining,
                    urgency=urgency,
                )
            )

        # Hypotheses → known_facts (high confidence) + hypotheses (other)
        hypotheses = await self._hyp_repo.get_active_by_patient(patient_id)
        known_facts = [h.hypothesis_text for h in hypotheses if h.confidence == "high"]
        hyp_texts = [h.hypothesis_text for h in hypotheses if h.confidence != "high"]

        # Staleness flags
        staleness_flags: list[str] = []
        if state:
            if state.last_caregiver_note_date:
                days = (today - state.last_caregiver_note_date).days
                if days >= 3:
                    staleness_flags.append(f"No caregiver note for {days} days")
            if state.last_lab_date:
                days = (today - state.last_lab_date).days
                if days >= 30:
                    staleness_flags.append(f"Lab results {days} days old")
            if not state.last_meera_log_date:
                staleness_flags.append("No Meera call logs recorded yet")

        unknowns = [f"Update needed: {flag}" for flag in staleness_flags]

        # First alert hypothesis → needs_action
        alert_hyps = [h for h in hypotheses if h.urgency == "alert"]
        needs_action = alert_hyps[0].hypothesis_text if alert_hyps else None

        # 15-min upload CTA token for WhatsApp digest
        upload_cta_token = create_upload_jwt(user_id, patient_id)

        return DigestResponse(
            period=period,
            generated_at=datetime.now(timezone.utc),
            overall_status=overall_status,
            today_summary=today_summary,
            known_facts=known_facts,
            hypotheses=hyp_texts,
            unknowns=unknowns,
            needs_action=needs_action,
            upcoming_events=upcoming,
            refill_alerts=refill_alerts,
            staleness_flags=staleness_flags,
            upload_cta_token=upload_cta_token,
        )

    async def update_preferences(
        self, user_id: UUID, data: DigestPreferencesUpdate
    ) -> None:
        user = await self._user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User", str(user_id))
        prefs = dict(user.preferences)
        if data.morning_time is not None:
            prefs["morning_digest_time"] = data.morning_time
        if data.evening_time is not None:
            prefs["evening_digest_time"] = data.evening_time
        if data.timezone is not None:
            prefs["timezone"] = data.timezone
        await self._user_repo.update_preferences(user_id, prefs)
