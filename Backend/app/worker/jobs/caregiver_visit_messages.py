"""
Caregiver Visit Messages — 8:00 AM IST daily.

For each caregiver scheduled to visit today, queues a pre-visit WhatsApp reminder.
Visit schedule stored in caregivers.visit_schedule as day names:
e.g. ["Monday", "Wednesday", "Friday"]

Reminder asks caregiver to log observations after the visit.
"""
import asyncio
from datetime import date

from app.core.celery import celery_app
from app.core.logging import get_logger
from app.repositories.caregiver_repository import CaregiverRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.patient_repository import PatientRepository
from app.worker._db import worker_conn
from app.worker.jobs._helpers import get_all_patient_ids

logger = get_logger(__name__)

# Python weekday() returns 0=Monday … 6=Sunday
_DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


@celery_app.task(name="caregiver_visit_messages")
def caregiver_visit_messages() -> None:
    asyncio.run(_async_run())


async def _async_run() -> None:
    today_name = _DAY_NAMES[date.today().weekday()]
    async with worker_conn(max_size=5, command_timeout=60) as conn:
        patient_ids = await get_all_patient_ids(conn)
        logger.info("caregiver_visit_messages.start", day=today_name, patient_count=len(patient_ids))
        total_sent = 0

        for patient_id in patient_ids:
            try:
                total_sent += await _remind_for_patient(conn, patient_id, today_name)
            except Exception as exc:
                logger.error(
                    "caregiver_visit_messages.patient_error",
                    patient_id=str(patient_id),
                    error=str(exc),
                )

        logger.info("caregiver_visit_messages.done", reminders_queued=total_sent)


async def _remind_for_patient(conn, patient_id, today_name: str) -> int:
    patient = await PatientRepository(conn).get_by_id(patient_id)
    if not patient:
        return 0

    caregivers = await CaregiverRepository(conn).get_by_patient_id(patient_id, active_only=True)
    visiting_today = [
        c for c in caregivers
        if c.invitation_status == "confirmed"
        and today_name.lower() in [d.lower() for d in (c.visit_schedule or [])]
    ]
    if not visiting_today:
        return 0

    notif_repo = NotificationRepository(conn)
    sent = 0

    for caregiver in visiting_today:
        visit_time = str(caregiver.visit_start_time) if caregiver.visit_start_time else "today"
        body = (
            f"Namaste {caregiver.name}! Reminder: you have a visit with "
            f"{patient.name} {visit_time}. "
            f"After the visit, please send a voice note or message with any updates."
        )
        from app.worker.jobs._helpers import send_whatsapp_to_phone
        await send_whatsapp_to_phone(caregiver.phone_number, body)
        
        notif = await notif_repo.create(
            patient_id=patient_id,
            recipient_caregiver_id=caregiver.id,
            type="caregiver_visit_reminder",
            channel="whatsapp",
            title=f"Visit reminder — {patient.name}",
            body=body,
        )
        await notif_repo.mark_sent(notif.id)
        sent += 1

        logger.info(
            "caregiver_visit_messages.queued",
            caregiver_id=str(caregiver.id),
            patient_id=str(patient_id),
        )

    return sent
