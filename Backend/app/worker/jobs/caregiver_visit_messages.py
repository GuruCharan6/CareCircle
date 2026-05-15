"""
Caregiver Visit Messages — 8:00 AM IST daily.

Sends a pre-visit WhatsApp reminder to caregivers visiting today.
Two sources trigger a reminder (either is sufficient):
  1. caregivers.visit_schedule contains today's day name (recurring weekly schedule)
  2. A calendar_events row with event_type='caregiver_visit' exists for today
     (one-off visits scheduled via the calendar)

CalendarEvent has no caregiver_id, so source 2 notifies ALL confirmed caregivers
for that patient. Deduplication ensures no caregiver gets two messages.
"""
import asyncio
from datetime import date
from uuid import UUID

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
    today = date.today()
    today_name = _DAY_NAMES[today.weekday()]
    async with worker_conn(max_size=5, command_timeout=60) as conn:
        patient_ids = await get_all_patient_ids(conn)
        logger.info("caregiver_visit_messages.start", day=today_name, patient_count=len(patient_ids))
        total_sent = 0

        for patient_id in patient_ids:
            try:
                total_sent += await _remind_for_patient(conn, patient_id, today_name, today)
            except Exception as exc:
                logger.error(
                    "caregiver_visit_messages.patient_error",
                    patient_id=str(patient_id),
                    error=str(exc),
                )

        logger.info("caregiver_visit_messages.done", reminders_queued=total_sent)


async def _get_calendar_visit_caregiver_ids(conn, patient_id: UUID, today: date) -> set[UUID] | None:
    """Return caregiver IDs from caregiver_visit calendar events for today.
    - If events exist WITH caregiver_id set → return those specific IDs
    - If events exist WITHOUT caregiver_id (old events) → return None (means: notify all)
    - If no events → return empty set (means: no calendar trigger)
    """
    rows = await conn.fetch(
        """
        SELECT caregiver_id FROM public.calendar_events
        WHERE patient_id = $1
          AND event_type = 'caregiver_visit'
          AND event_date = $2
          AND status != 'cancelled'
        """,
        patient_id, today,
    )
    if not rows:
        return set()  # no calendar event today

    ids: set[UUID] = set()
    has_null = False
    for row in rows:
        if row["caregiver_id"] is None:
            has_null = True
        else:
            ids.add(row["caregiver_id"])

    if has_null:
        return None  # at least one event has no caregiver_id → fallback: notify all
    return ids


async def _remind_for_patient(conn, patient_id: UUID, today_name: str, today: date) -> int:
    patient = await PatientRepository(conn).get_by_id(patient_id)
    if not patient:
        return 0

    caregivers = await CaregiverRepository(conn).get_by_patient_id(patient_id, active_only=True)
    confirmed = [c for c in caregivers if c.invitation_status == "confirmed"]
    if not confirmed:
        return 0

    # Source 1: recurring visit_schedule contains today
    schedule_ids = {
        c.id for c in confirmed
        if today_name.lower() in [d.lower() for d in (c.visit_schedule or [])]
    }

    # Source 2: one-off caregiver_visit calendar event for today
    # Returns: set of specific caregiver IDs | None (notify all) | empty set (no event)
    calendar_ids = await _get_calendar_visit_caregiver_ids(conn, patient_id, today)

    # Build notify set:
    # - schedule match → always included
    # - calendar None (old event, no caregiver_id) → include all confirmed
    # - calendar set → include only those specific caregivers
    if calendar_ids is None:
        # Fallback: old event without caregiver_id → notify all confirmed
        to_notify = {c.id: c for c in confirmed}
    else:
        to_notify = {
            c.id: c for c in confirmed
            if c.id in schedule_ids or c.id in calendar_ids
        }

    if not to_notify:
        return 0

    # calendar_visit_today: True if a calendar event triggered (None = all notified, set = some)
    calendar_visit_today = calendar_ids is None or len(calendar_ids) > 0

    notif_repo = NotificationRepository(conn)
    sent = 0

    from app.worker.jobs._helpers import send_whatsapp_to_phone

    for caregiver in to_notify.values():
        visit_time = str(caregiver.visit_start_time) if caregiver.visit_start_time else "today"
        source = "schedule+calendar" if (caregiver.id in schedule_ids and calendar_visit_today) \
            else ("calendar" if calendar_visit_today else "schedule")
        body = (
            f"Namaste {caregiver.name}! Reminder: you have a visit with "
            f"{patient.name} {visit_time}. "
            f"After the visit, please send a voice note or message with any updates."
        )
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
            source=source,
        )

    return sent
