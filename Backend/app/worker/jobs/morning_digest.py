"""
Morning digest — single-patient task, scheduled via dispatch_morning_digests ETA.
"""
import asyncio
from datetime import date
from uuid import UUID

from app.core.celery import celery_app
from app.core.logging import get_logger
from app.repositories.calendar_event_repository import CalendarEventRepository
from app.repositories.clinical_hypothesis_repository import ClinicalHypothesisRepository
from app.repositories.medication_repository import MedicationRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.patient_state_repository import PatientStateRepository
from app.worker._db import worker_conn
from app.worker.jobs._helpers import (
    get_user_id_for_patient,
    try_push,
    try_whatsapp_digest_cta,
)

logger = get_logger(__name__)


@celery_app.task(name="morning_digest_for_patient")
def morning_digest_for_patient(patient_id: str) -> None:
    asyncio.run(_async_run(UUID(patient_id)))


async def _async_run(patient_id: UUID) -> None:
    async with worker_conn(max_size=3, command_timeout=60) as conn:
        try:
            await _digest_for_patient(conn, patient_id)
        except Exception as exc:
            logger.error(
                "morning_digest.patient_error",
                patient_id=str(patient_id),
                error=str(exc),
            )


async def _digest_for_patient(conn, patient_id: UUID) -> None:
    # Idempotency: don't double-send if task retried or dispatched twice
    today = date.today()
    already_sent = await conn.fetchval(
        """SELECT 1 FROM public.notifications
           WHERE patient_id = $1 AND type = 'morning_digest'
             AND created_at::date = $2
           LIMIT 1""",
        patient_id, today,
    )
    if already_sent:
        return

    patient_repo = PatientRepository(conn)
    med_repo = MedicationRepository(conn)
    hyp_repo = ClinicalHypothesisRepository(conn)
    cal_repo = CalendarEventRepository(conn)
    notif_repo = NotificationRepository(conn)

    patient = await patient_repo.get_by_id(patient_id)
    if not patient:
        return

    active_meds = await med_repo.get_active_by_patient(patient_id)
    alerts = await hyp_repo.get_by_urgency(patient_id, "alert")
    watches = await hyp_repo.get_by_urgency(patient_id, "watch")
    upcoming = await cal_repo.get_upcoming(patient_id, within_days=7)

    # Milestone days: only push lab test reminder on day 7, 3, 1, 0 before test
    _MILESTONE_DAYS = {0, 1, 3, 7}
    milestone_lab_tests = [
        e for e in upcoming
        if e.event_type == "lab_test"
        and e.status == "confirmed"
        and (e.event_date - today).days in _MILESTONE_DAYS
    ]
    other_events = [e for e in upcoming if e.event_type != "lab_test"]

    lines = []
    if alerts:
        lines.append(f"{len(alerts)} alert(s) need attention.")
    if watches:
        lines.append(f"{len(watches)} watch item(s) to track.")
    if other_events:
        lines.append(f"Upcoming: {other_events[0].title} on {other_events[0].event_date}.")
    if milestone_lab_tests:
        names = ", ".join(e.title.removeprefix("Lab Test: ") for e in milestone_lab_tests[:3])
        days = (milestone_lab_tests[0].event_date - today).days
        lines.append(
            f"Lab test(s) due today: {names}."
            if days == 0 else f"Lab test(s) due in {days} day(s): {names}."
        )
    if active_meds:
        lines.append(f"{len(active_meds)} active medication(s) today.")
    if not lines:
        lines.append("No new alerts. Keep monitoring.")

    title = f"Morning update for {patient.name}"
    body = " ".join(lines)
    digest_content = {
        "alerts": [{"id": str(h.id), "text": h.hypothesis_text[:120]} for h in alerts],
        "watches": [{"id": str(h.id), "text": h.hypothesis_text[:120]} for h in watches],
        "upcoming_events": [
            {"id": str(e.id), "title": e.title, "date": str(e.event_date)}
            for e in other_events[:3]
        ],
        "lab_tests_due": [
            {"id": str(e.id), "title": e.title, "date": str(e.event_date),
             "days_until": (e.event_date - today).days}
            for e in milestone_lab_tests
        ],
        "active_medication_count": len(active_meds),
    }

    user_id = await get_user_id_for_patient(conn, patient_id)

    notif = await notif_repo.create(
        patient_id=patient_id,
        recipient_user_id=user_id,
        type="morning_digest",
        channel="push",
        title=title,
        body=body,
        digest_period="morning",
        digest_content=digest_content,
    )
    await notif_repo.mark_sent(notif.id)

    # Persist summary to patient state for dashboard banner
    state_repo = PatientStateRepository(conn)
    await state_repo.update_summary(patient_id, body)

    if user_id:
        await try_push(conn, user_id, title, body, data={"type": "morning_digest"})
        await try_whatsapp_digest_cta(conn, user_id, patient_id, f"*{title}*\n\n{body}")

    logger.info(
        "morning_digest.sent",
        patient_id=str(patient_id),
        alerts=len(alerts),
        watches=len(watches),
    )
