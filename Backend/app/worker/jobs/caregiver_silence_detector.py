"""
Caregiver Silence Detector — 7:00 PM IST daily.

For each patient with confirmed caregivers, checks when last caregiver_voice
observation was received:
- >= 3 days silent → 'watch' push notification to Meera user
- >= 7 days silent → 'alert' push notification (escalate)

This is operational reliability signal, not clinical inference.
One notification per patient per silence event (avoids spam).
"""
import asyncio
from datetime import date

from app.core.celery import celery_app
from app.core.logging import get_logger
from app.repositories.caregiver_repository import CaregiverRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.observation_repository import ObservationRepository
from app.repositories.patient_repository import PatientRepository
from app.worker._db import worker_conn
from app.worker.jobs._helpers import get_all_patient_ids, get_user_id_for_patient, try_push

logger = get_logger(__name__)

_WATCH_SILENCE_DAYS = 3
_ALERT_SILENCE_DAYS = 7


@celery_app.task(name="caregiver_silence_detector")
def caregiver_silence_detector() -> None:
    asyncio.run(_async_run())


async def _async_run() -> None:
    async with worker_conn(max_size=5, command_timeout=60) as conn:
        patient_ids = await get_all_patient_ids(conn)
        logger.info("caregiver_silence_detector.start", patient_count=len(patient_ids))
        flagged = 0

        for patient_id in patient_ids:
            try:
                flagged += await _check_for_patient(conn, patient_id)
            except Exception as exc:
                logger.error(
                    "caregiver_silence_detector.patient_error",
                    patient_id=str(patient_id),
                    error=str(exc),
                )

        logger.info("caregiver_silence_detector.done", flagged=flagged)


async def _check_for_patient(conn, patient_id) -> int:
    patient = await PatientRepository(conn).get_by_id(patient_id)
    if not patient:
        return 0

    caregivers = await CaregiverRepository(conn).get_by_patient_id(patient_id, active_only=True)
    confirmed = [c for c in caregivers if c.invitation_status == "confirmed"]
    if not confirmed:
        return 0  # no caregivers assigned — silence detector not applicable

    latest_obs = await ObservationRepository(conn).get_latest(patient_id, "caregiver_voice")
    if latest_obs:
        silence_days = (date.today() - latest_obs.observation_date).days
    else:
        silence_days = 999  # never reported

    if silence_days < _WATCH_SILENCE_DAYS:
        return 0

    is_alert = silence_days >= _ALERT_SILENCE_DAYS
    caregiver_names = ", ".join(c.name for c in confirmed[:2])
    user_id = await get_user_id_for_patient(conn, patient_id)

    title = f"{'Alert' if is_alert else 'Note'}: No caregiver update — {patient.name}"
    body = (
        f"{caregiver_names} {'has' if len(confirmed) == 1 else 'have'} not submitted "
        f"an update in {silence_days} day(s). "
        f"{'Immediate follow-up recommended.' if is_alert else 'Consider following up.'}"
    )

    notif_repo = NotificationRepository(conn)
    await notif_repo.create(
        patient_id=patient_id,
        recipient_user_id=user_id,
        type="staleness_notice",
        channel="push",
        title=title,
        body=body,
    )

    if user_id:
        await try_push(conn, user_id, title, body)

    logger.info(
        "caregiver_silence_detector.flagged",
        patient_id=str(patient_id),
        silence_days=silence_days,
        is_alert=is_alert,
    )
    return 1
