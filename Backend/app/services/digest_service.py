from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID

import asyncpg

from app.core.exceptions import NotFoundError
from app.lib.upload_jwt import create_upload_jwt
from app.models.observation import Observation
from app.repositories.calendar_event_repository import CalendarEventRepository
from app.repositories.clinical_hypothesis_repository import ClinicalHypothesisRepository
from app.repositories.drug_interaction_repository import DrugInteractionRepository
from app.repositories.medication_refill_repository import MedicationRefillRepository
from app.repositories.medication_repository import MedicationRepository
from app.repositories.observation_repository import ObservationRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.patient_state_repository import PatientStateRepository
from app.repositories.user_repository import UserRepository
from app.schemas.calendar import CalendarEventListItem
from app.schemas.digest import (
    DigestDrugInteraction,
    DigestPreferencesUpdate,
    DigestRecentObservation,
    DigestRefillAlert,
    DigestResponse,
)


def _build_observation_summary(obs: Observation) -> str:
    parts: list[str] = []

    if obs.concerns_flagged:
        parts.append(obs.concerns_flagged[0])

    if obs.symptoms_reported:
        parts.append(f"symptoms: {', '.join(obs.symptoms_reported[:2])}")

    if obs.medications_taken is True:
        timing = f" ({obs.medication_timing_notes})" if obs.medication_timing_notes else ""
        parts.append(f"medication taken{timing}")
    elif obs.medications_taken is False:
        parts.append("medication missed")

    if obs.mood and obs.mood not in ("normal", "good"):
        parts.append(f"mood: {obs.mood}")

    if obs.energy_level and obs.energy_level != "normal":
        parts.append(f"energy: {obs.energy_level}")

    if obs.meal_notes:
        parts.append(obs.meal_notes[:60])

    if not parts:
        parts.append("checked in")

    return " · ".join(parts)


class DigestService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._patient_repo = PatientRepository(conn)
        self._state_repo = PatientStateRepository(conn)
        self._calendar_repo = CalendarEventRepository(conn)
        self._refill_repo = MedicationRefillRepository(conn)
        self._med_repo = MedicationRepository(conn)
        self._hyp_repo = ClinicalHypothesisRepository(conn)
        self._user_repo = UserRepository(conn)
        self._drug_repo = DrugInteractionRepository(conn)
        self._obs_repo = ObservationRepository(conn)

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

        # Drug interactions — deduplicated by sorted pair, alert/watch only
        raw_interactions = await self._drug_repo.get_by_patient_id(patient_id)
        seen_pairs: set[tuple[str, str]] = set()
        drug_interactions: list[DigestDrugInteraction] = []
        for ix in sorted(raw_interactions, key=lambda x: {"alert": 0, "watch": 1}.get(x.final_urgency, 2)):
            pair: tuple[str, str] = (
                min(ix.drug_a_generic, ix.drug_b_generic),
                max(ix.drug_a_generic, ix.drug_b_generic),
            )
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)
            drug_interactions.append(DigestDrugInteraction(
                drug_a=ix.drug_a_generic,
                drug_b=ix.drug_b_generic,
                severity=ix.severity,
                urgency=ix.final_urgency,
                note=ix.gemini_note,
            ))

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

        # Morning: last 24 h (overnight notes). Evening: today only.
        obs_within_days = 1 if period == "morning" else 0
        raw_obs = await self._obs_repo.get_recent_caregiver(patient_id, within_days=obs_within_days, limit=5)
        recent_observations = [
            DigestRecentObservation(
                source_type=o.source_type,
                caregiver_name=o.caregiver_name,
                observation_date=o.observation_date,
                created_at=o.created_at,
                mood=o.mood,
                energy_level=o.energy_level,
                medications_taken=o.medications_taken,
                symptoms_reported=o.symptoms_reported or [],
                concerns_flagged=o.concerns_flagged or [],
                summary=_build_observation_summary(o),
            )
            for o in raw_obs
        ]

        # Generate fresh today_summary from current data
        summary_parts: list[str] = []
        if alert_hyps:
            summary_parts.append(f"{len(alert_hyps)} alert(s) need immediate attention.")
        if drug_interactions:
            summary_parts.append(f"{len(drug_interactions)} drug interaction(s) detected.")
        if raw_obs:
            summary_parts.append("Caregiver update received." if period == "evening" else "Recent caregiver notes available.")
        if not summary_parts:
            if overall_status == "alert":
                summary_parts.append("Health alert detected. Review details below.")
            elif overall_status == "watch":
                summary_parts.append("Monitoring active. Some items need attention.")
            else:
                summary_parts.append("All monitored parameters look stable.")
        today_summary = " ".join(summary_parts)

        # 15-min upload CTA token for WhatsApp digest
        upload_cta_token = create_upload_jwt(user_id, patient_id)

        return DigestResponse(
            period=period,
            generated_at=datetime.now(UTC),
            overall_status=overall_status,
            today_summary=today_summary,
            known_facts=known_facts,
            hypotheses=hyp_texts,
            unknowns=unknowns,
            needs_action=needs_action,
            upcoming_events=upcoming,
            refill_alerts=refill_alerts,
            drug_interactions=drug_interactions,
            staleness_flags=staleness_flags,
            recent_observations=recent_observations,
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
            prefs["morning_time"] = data.morning_time
        if data.evening_time is not None:
            prefs["evening_time"] = data.evening_time
        if data.timezone is not None:
            prefs["timezone"] = data.timezone
        await self._user_repo.update_preferences(user_id, prefs)
