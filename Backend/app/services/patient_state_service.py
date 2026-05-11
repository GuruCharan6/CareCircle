from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

import asyncpg

from app.cache.patient_state_cache import get_patient_state, set_patient_state
from app.core.exceptions import NotFoundError
from app.models.patient_state import PatientState
from app.repositories.calendar_event_repository import CalendarEventRepository
from app.repositories.drug_interaction_repository import DrugInteractionRepository
from app.repositories.gap_action_repository import GapActionRepository
from app.repositories.medication_refill_repository import MedicationRefillRepository
from app.repositories.medication_repository import MedicationRepository
from app.repositories.patient_state_repository import PatientStateRepository
from app.schemas.patient_state import PatientStateResponse, StalenessIndicator

# Staleness threshold in days per source type
_THRESHOLDS = {
    "lab": 30,
    "caregiver_note": 7,
    "meera_log": 3,
    "prescription": 90,
}


class PatientStateService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._conn = conn
        self._repo = PatientStateRepository(conn)

    async def get(self, patient_id: UUID) -> PatientStateResponse:
        # Cache-aside: Redis (5-min TTL) → miss → asyncpg → set cache
        cached = await get_patient_state(patient_id)
        if cached:
            state = PatientState(**_parse_state_dict(cached))
        else:
            state = await self._repo.get_by_patient_id(patient_id)
            if not state:
                raise NotFoundError("PatientState", str(patient_id))
            await set_patient_state(patient_id, state.model_dump(mode="json"))

        today = date.today()
        indicators = _build_staleness_indicators(state, today)
        
        # Calculate freshness score (0-100)
        # Each of the 4 indicators contributes 25 points max
        score_map = {"fresh": 25, "aging": 15, "stale": 5, "critical": 0}
        freshness_score = sum(score_map.get(ind.status, 0) for ind in indicators)

        # Fetch appointments scheduled for the soonest upcoming date (up to 30 days)
        cal_repo = CalendarEventRepository(self._conn)
        upcoming = await cal_repo.get_upcoming(patient_id, within_days=30)
        
        next_appts = []
        if upcoming:
            first_date = upcoming[0].event_date
            next_appts = [
                {**e.model_dump(mode="json"), "days_until": (e.event_date - today).days}
                for e in upcoming if e.event_date == first_date
            ]

        # Fetch confirmed/possible drug interactions
        interaction_repo = DrugInteractionRepository(self._conn)
        interactions = await interaction_repo.get_by_patient_id(patient_id)
        
        # Fetch refill alerts (30-day window)
        refill_repo = MedicationRefillRepository(self._conn)
        med_repo = MedicationRepository(self._conn)
        refills_due = await refill_repo.get_due_soon(patient_id, within_days=30)
        
        refill_alerts = []
        for refill in refills_due:
            med = await med_repo.get_by_id(refill.medication_id)
            days_remaining = (refill.refill_due_date - today).days
            urgency = "alert" if days_remaining <= 3 else "watch"
            refill_alerts.append({
                "medication_id": str(refill.medication_id),
                "generic_name": med.generic_name if med else "Unknown",
                "brand_name": med.brand_name if med else None,
                "days_remaining": days_remaining,
                "urgency": urgency,
                "due_date": refill.refill_due_date.isoformat(),
            })

        # Fetch care gap actions
        gap_repo = GapActionRepository(self._conn)
        pending_gaps = await gap_repo.get_pending_by_patient(patient_id)
        gap_actions = []
        for gap in pending_gaps:
            label = gap.action_type.replace("_", " ").title()
            if gap.test_name:
                label = f"{label}: {gap.test_name}"
            gap_actions.append(f"{label} by {gap.due_by.strftime('%d %b %Y')}")

        # Fetch Emergency Follow-ups (unread watch_event_card notifications)
        from app.repositories.notification_repository import NotificationRepository
        notif_repo = NotificationRepository(self._conn)
        
        # We look for unread notifications for this patient
        notifs = await notif_repo.get_by_patient_id(patient_id, limit=20)
        
        emergency_follow_ups = [
            {
                "id": str(n.id),
                "title": n.title,
                "body": n.body,
                "created_at": n.created_at.isoformat() if n.created_at else datetime.now().isoformat(),
                "deep_link": n.action_deep_link
            }
            for n in notifs if n.type == "watch_event_card" and n.status != "read"
        ]

        # Fetch Suggested Appointments
        suggested_appts = [
            {**e.model_dump(mode="json"), "days_until": (e.event_date - today).days}
            for e in upcoming if e.status == "suggested"
        ]

        # Recalculate Counts for accurate Dashboard Summary
        # Deduplicate interactions first (matching frontend logic)
        seen_ix = set()
        deduped_interactions = []
        for ix in interactions:
            key = "||".join(sorted([ix.drug_a_generic, ix.drug_b_generic]))
            if key not in seen_ix:
                seen_ix.add(key)
                deduped_interactions.append(ix)

        # 1. Alerts (Red)
        high_interactions = [i for i in deduped_interactions if (i.severity or i.final_urgency or "low").lower() in ("critical", "high", "major", "alert", "contraindicated")]
        new_alerts_count = len(high_interactions) + len(emergency_follow_ups)
        
        # 2. Watch (Amber)
        mod_interactions = [i for i in deduped_interactions if (i.severity or i.final_urgency or "low").lower() in ("moderate", "watch")]
        new_watch_count = len(mod_interactions) + len(refill_alerts) + len(suggested_appts) + len(gap_actions)

        # 3. Overall Status
        new_status = state.overall_status
        if new_alerts_count > 0:
            new_status = "alert"
        elif new_watch_count > 0:
            new_status = "watch"
        else:
            new_status = "stable"

        data = state.model_dump()
        data["active_alerts_count"] = new_alerts_count
        data["active_watch_count"] = new_watch_count
        data["overall_status"] = new_status
        data["staleness_indicators"] = [ind.model_dump() for ind in indicators]
        data["upcoming_appointments"] = [a for a in next_appts if a["status"] != "suggested"]
        data["drug_interactions"] = [i.model_dump(mode="json") for i in interactions]
        data["refill_alerts"] = refill_alerts
        data["gap_actions"] = gap_actions
        data["emergency_follow_ups"] = emergency_follow_ups
        data["suggested_appointments"] = suggested_appts
        data["freshness_score"] = freshness_score
        data["computed_at"] = datetime.now()
        return PatientStateResponse(**data)


def _build_staleness_indicators(
    state: PatientState, today: date
) -> list[StalenessIndicator]:
    sources = [
        ("lab", state.last_lab_date, _THRESHOLDS["lab"]),
        ("caregiver_note", state.last_caregiver_note_date, _THRESHOLDS["caregiver_note"]),
        ("meera_log", state.last_meera_log_date, _THRESHOLDS["meera_log"]),
        ("prescription", state.last_prescription_date, _THRESHOLDS["prescription"]),
    ]
    result = []
    for source, last_date, threshold in sources:
        if last_date:
            days_since = (today - last_date).days
            if days_since <= threshold // 3:
                status = "fresh"
            elif days_since <= threshold // 2:
                status = "aging"
            elif days_since <= threshold:
                status = "stale"
            else:
                status = "critical"
        else:
            days_since = None
            status = "critical"
        result.append(
            StalenessIndicator(
                source=source,
                last_date=last_date,
                days_since=days_since,
                status=status,
                threshold_days=threshold,
            )
        )
    return result


def _parse_state_dict(d: dict) -> dict:
    """Convert ISO date strings back to date objects for PatientState constructor."""
    from datetime import datetime
    date_fields = (
        "last_lab_date", "last_caregiver_note_date",
        "last_meera_log_date", "last_prescription_date",
    )
    out = dict(d)
    for field in date_fields:
        if out.get(field) and isinstance(out[field], str):
            out[field] = date.fromisoformat(out[field])
    if out.get("updated_at") and isinstance(out["updated_at"], str):
        out["updated_at"] = datetime.fromisoformat(out["updated_at"])
    return out
