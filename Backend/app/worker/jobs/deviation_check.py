"""
Deviation Check — 12:00 PM IST daily.

Midday refresh: triggers rebuild_patient_state for all patients so
patient_state stays accurate between morning and evening digests.

Also flags patients with >= 3 simultaneous active alerts as a
potential rapid-deterioration signal — creates an 'alert' push notification.
"""
import asyncio

from app.core.celery import celery_app
from app.core.logging import get_logger
from app.repositories.notification_repository import NotificationRepository
from app.worker._db import worker_conn
from app.worker.jobs._helpers import get_all_patient_ids, get_user_id_for_patient, try_push
from app.worker.tasks.rebuild_patient_state import rebuild_patient_state

logger = get_logger(__name__)

_HIGH_ALERT_THRESHOLD = 3  # >= 3 simultaneous active alerts = deviation flag


@celery_app.task(name="deviation_check")
def deviation_check() -> None:
    asyncio.run(_async_run())


async def _async_run() -> None:
    async with worker_conn(max_size=3, command_timeout=60) as conn:
        patient_ids = await get_all_patient_ids(conn)
        logger.info("deviation_check.start", patient_count=len(patient_ids))

        # Dispatch state rebuilds first (they run as separate tasks)
        for patient_id in patient_ids:
            rebuild_patient_state.delay(str(patient_id))

        # Then check for high alert accumulation in this connection
        flagged = 0
        for patient_id in patient_ids:
            try:
                flagged += await _check_alert_accumulation(conn, patient_id)
            except Exception as exc:
                logger.error(
                    "deviation_check.patient_error",
                    patient_id=str(patient_id),
                    error=str(exc),
                )

        logger.info(
            "deviation_check.done",
            patient_count=len(patient_ids),
            high_alert_patients=flagged,
        )


async def _check_alert_accumulation(conn, patient_id) -> int:
    alert_count = int(await conn.fetchval(
        """SELECT COUNT(*) FROM public.clinical_hypotheses
           WHERE patient_id = $1 AND status = 'active' AND urgency = 'alert'""",
        patient_id,
    ) or 0)

    if alert_count < _HIGH_ALERT_THRESHOLD:
        return 0

    patient_name = await conn.fetchval(
        "SELECT name FROM public.patients WHERE id = $1", patient_id
    )
    user_id = await get_user_id_for_patient(conn, patient_id)

    title = f"Multiple alerts active — {patient_name}"
    body = (
        f"{alert_count} simultaneous active alerts for {patient_name}. "
        f"Review the situation — consider contacting the doctor today."
    )

    await NotificationRepository(conn).create(
        patient_id=patient_id,
        recipient_user_id=user_id,
        type="alert",
        channel="push",
        title=title,
        body=body,
    )

    if user_id:
        await try_push(conn, user_id, title, body, data={"type": "deviation_alert"})

    logger.info(
        "deviation_check.high_alerts_flagged",
        patient_id=str(patient_id),
        alert_count=alert_count,
    )
    return 1
