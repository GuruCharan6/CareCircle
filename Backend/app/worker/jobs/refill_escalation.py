"""
Refill Escalation — 10:00 AM IST daily.

For each pending 'refill_medication' gap_action:
- escalation_level == 0: send first reminder, escalate level to 1
- escalation_level >= 1, due within 3 days: escalate again (max level 3)
- due date passed: mark gap_action as 'overdue'
"""
import asyncio
from datetime import date, timedelta

from app.core.celery import celery_app
from app.core.logging import get_logger
from app.repositories.gap_action_repository import GapActionRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.patient_repository import PatientRepository
from app.worker._db import worker_conn
from app.worker.jobs._helpers import get_all_patient_ids, get_user_id_for_patient, try_push

logger = get_logger(__name__)


@celery_app.task(name="refill_escalation")
def refill_escalation() -> None:
    asyncio.run(_async_run())


async def _async_run() -> None:
    async with worker_conn(max_size=5, command_timeout=60) as conn:
        patient_ids = await get_all_patient_ids(conn)
        logger.info("refill_escalation.start", patient_count=len(patient_ids))

        for patient_id in patient_ids:
            try:
                await _escalate_for_patient(conn, patient_id)
            except Exception as exc:
                logger.error(
                    "refill_escalation.patient_error",
                    patient_id=str(patient_id),
                    error=str(exc),
                )


async def _escalate_for_patient(conn, patient_id) -> None:
    gap_repo = GapActionRepository(conn)
    notif_repo = NotificationRepository(conn)

    gaps = await gap_repo.get_pending_by_patient(patient_id)
    refill_gaps = [g for g in gaps if g.action_type == "refill_medication"]
    if not refill_gaps:
        return

    patient = await PatientRepository(conn).get_by_id(patient_id)
    if not patient:
        return

    user_id = await get_user_id_for_patient(conn, patient_id)
    today = date.today()

    for gap in refill_gaps:
        days_until_due = (gap.due_by - today).days

        # Overdue — update status, skip notification
        if days_until_due < 0:
            await conn.execute(
                "UPDATE public.gap_actions SET status = 'overdue' WHERE id = $1",
                gap.id,
            )
            logger.info("refill_escalation.overdue", gap_id=str(gap.id))
            continue

        # First reminder
        if gap.escalation_level == 0:
            title = f"Medication refill needed — {patient.name}"
            body = (
                f"A medication refill is due in {days_until_due} day(s). "
                f"Please arrange it soon."
            )
            await notif_repo.create(
                patient_id=patient_id,
                recipient_user_id=user_id,
                type="refill_reminder",
                channel="push",
                title=title,
                body=body,
                linked_entity_type="medication",
                linked_entity_id=gap.medication_id,
            )
            await gap_repo.escalate(gap.id)
            if user_id:
                await try_push(conn, user_id, title, body)
            logger.info("refill_escalation.first_reminder", gap_id=str(gap.id), days=days_until_due)

        # Urgent escalation — due within 3 days, not yet at max
        elif days_until_due <= 3 and gap.escalation_level < 3:
            title = f"Urgent: medication refill overdue soon — {patient.name}"
            body = (
                f"Refill due in {days_until_due} day(s). Please act immediately."
            )
            await notif_repo.create(
                patient_id=patient_id,
                recipient_user_id=user_id,
                type="refill_reminder",
                channel="push",
                title=title,
                body=body,
                linked_entity_type="medication",
                linked_entity_id=gap.medication_id,
            )
            await gap_repo.escalate(gap.id)
            if user_id:
                await try_push(conn, user_id, title, body)
            logger.info(
                "refill_escalation.escalated",
                gap_id=str(gap.id),
                new_level=gap.escalation_level + 1,
                days=days_until_due,
            )
