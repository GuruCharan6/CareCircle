"""
Evening digest — single-patient task, scheduled via dispatch_evening_digests ETA.
"""
import asyncio
from datetime import date
from uuid import UUID

from app.core.celery import celery_app
from app.core.logging import get_logger
from app.repositories.notification_repository import NotificationRepository
from app.repositories.observation_repository import ObservationRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.patient_state_repository import PatientStateRepository
from app.worker._db import worker_conn
from app.worker.jobs._helpers import (
    get_user_id_for_patient,
    try_push,
    try_whatsapp_digest_cta,
)

logger = get_logger(__name__)


@celery_app.task(name="evening_digest_for_patient")
def evening_digest_for_patient(patient_id: str) -> None:
    asyncio.run(_async_run(UUID(patient_id)))


async def _async_run(patient_id: UUID) -> None:
    async with worker_conn(max_size=3, command_timeout=60) as conn:
        try:
            await _digest_for_patient(conn, patient_id)
        except Exception as exc:
            logger.error(
                "evening_digest.patient_error",
                patient_id=str(patient_id),
                error=str(exc),
            )


async def _digest_for_patient(conn, patient_id: UUID) -> None:
    # Idempotency: don't double-send if task retried or dispatched twice
    today = date.today()
    already_sent = await conn.fetchval(
        """SELECT 1 FROM public.notifications
           WHERE patient_id = $1 AND type = 'evening_digest'
             AND created_at::date = $2
           LIMIT 1""",
        patient_id, today,
    )
    if already_sent:
        return

    patient_repo = PatientRepository(conn)
    obs_repo = ObservationRepository(conn)
    notif_repo = NotificationRepository(conn)

    patient = await patient_repo.get_by_id(patient_id)
    if not patient:
        return

    all_obs = await obs_repo.get_by_patient_id(patient_id, limit=5)
    caregiver_reported_today = any(
        o.source_type == "caregiver_note" and o.observation_date == today
        for o in all_obs
    )

    today_alerts = int(await conn.fetchval(
        """SELECT COUNT(*) FROM public.clinical_hypotheses
           WHERE patient_id = $1 AND urgency = 'alert' AND status = 'active'
             AND created_at::date = $2""",
        patient_id, today,
    ) or 0)
    today_watches = int(await conn.fetchval(
        """SELECT COUNT(*) FROM public.clinical_hypotheses
           WHERE patient_id = $1 AND urgency = 'watch' AND status = 'active'
             AND created_at::date = $2""",
        patient_id, today,
    ) or 0)

    today_obs = [o for o in all_obs if o.observation_date == today]
    latest_obs = today_obs[0] if today_obs else None
    meds_taken = latest_obs.medications_taken if latest_obs else None

    lines = []
    lines.append(
        "Caregiver update received today." if caregiver_reported_today
        else "No caregiver update received today."
    )
    if meds_taken is True:
        lines.append("Medications taken.")
    elif meds_taken is False:
        lines.append("Medications may have been missed — check with Dad.")
    if today_alerts > 0:
        lines.append(f"{today_alerts} new alert(s) today.")
    if today_watches > 0:
        lines.append(f"{today_watches} new watch item(s) today.")

    title = f"Evening update for {patient.name}"
    body = " ".join(lines)
    digest_content = {
        "caregiver_reported_today": caregiver_reported_today,
        "medications_taken": meds_taken,
        "new_alerts_today": today_alerts,
        "new_watches_today": today_watches,
    }

    user_id = await get_user_id_for_patient(conn, patient_id)

    notif = await notif_repo.create(
        patient_id=patient_id,
        recipient_user_id=user_id,
        type="evening_digest",
        channel="push",
        title=title,
        body=body,
        digest_period="evening",
        digest_content=digest_content,
    )
    await notif_repo.mark_sent(notif.id)

    # Persist summary to patient state for dashboard banner
    state_repo = PatientStateRepository(conn)
    await state_repo.update_summary(patient_id, body)

    if user_id:
        await try_push(conn, user_id, title, body, data={"type": "evening_digest"})
        await try_whatsapp_digest_cta(conn, user_id, patient_id, f"*{title}*\n\n{body}")

    logger.info(
        "evening_digest.sent",
        patient_id=str(patient_id),
        caregiver_reported=caregiver_reported_today,
    )
