"""
Caregiver Monthly Check — 1st of month, 10:00 AM IST.

Sends a monthly WhatsApp message to each confirmed caregiver asking for a health summary.
Creates a notification record per caregiver (channel='whatsapp').
WhatsApp delivery happens via Twilio webhook handler (separate flow).
"""
import asyncio

from app.core.celery import celery_app
from app.core.logging import get_logger
from app.repositories.caregiver_repository import CaregiverRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.patient_repository import PatientRepository
from app.worker._db import worker_conn
from app.worker.jobs._helpers import get_all_patient_ids, send_whatsapp_to_phone

logger = get_logger(__name__)


@celery_app.task(name="caregiver_monthly_check")
def caregiver_monthly_check() -> None:
    asyncio.run(_async_run())


async def _async_run() -> None:
    async with worker_conn(max_size=5, command_timeout=60) as conn:
        patient_ids = await get_all_patient_ids(conn)
        logger.info("caregiver_monthly_check.start", patient_count=len(patient_ids))
        total_sent = 0

        for patient_id in patient_ids:
            try:
                total_sent += await _check_for_patient(conn, patient_id)
            except Exception as exc:
                logger.error(
                    "caregiver_monthly_check.patient_error",
                    patient_id=str(patient_id),
                    error=str(exc),
                )

        logger.info("caregiver_monthly_check.done", messages_queued=total_sent)


async def _check_for_patient(conn, patient_id) -> int:
    patient = await PatientRepository(conn).get_by_id(patient_id)
    if not patient:
        return 0

    caregivers = await CaregiverRepository(conn).get_by_patient_id(patient_id, active_only=True)
    confirmed = [c for c in caregivers if c.invitation_status == "confirmed"]
    if not confirmed:
        return 0

    notif_repo = NotificationRepository(conn)
    sent = 0

    for caregiver in confirmed:
        if not caregiver.phone_number:
            logger.warning(
                "caregiver_monthly_check.no_phone",
                caregiver_id=str(caregiver.id),
            )
            continue
        body = (
            f"Namaste {caregiver.name}! Monthly check-in for {patient.name}. "
            f"How is he/she doing overall this month? "
            f"Any changes in health, behaviour, or concerns? "
            f"Reply to share an update with the family."
        )
        notif = await notif_repo.create(
            patient_id=patient_id,
            recipient_caregiver_id=caregiver.id,
            type="caregiver_update_request",
            channel="whatsapp",
            title=f"Monthly check-in — {patient.name}",
            body=body,
        )
        # Actually send the WhatsApp message to the caregiver
        await send_whatsapp_to_phone(caregiver.phone_number, body)
        await notif_repo.mark_sent(notif.id)
        sent += 1
        logger.info(
            "caregiver_monthly_check.queued",
            caregiver_id=str(caregiver.id),
            patient_id=str(patient_id),
        )

    return sent
