"""
Calendar Event Reminders — 8:00 AM IST daily.

Sends T-1 day reminders for confirmed appointments and lab tests.
"""
import asyncio
from datetime import date, timedelta

from app.core.celery import celery_app
from app.core.logging import get_logger
from app.repositories.calendar_event_repository import CalendarEventRepository
from app.repositories.notification_repository import NotificationRepository
from app.worker._db import worker_conn
from app.worker.jobs._helpers import get_all_patient_ids, get_user_id_for_patient, try_push, try_whatsapp

logger = get_logger(__name__)


@celery_app.task(name="calendar_reminders")
def calendar_reminders() -> None:
    asyncio.run(_async_run())


async def _async_run() -> None:
    async with worker_conn(max_size=5, command_timeout=60) as conn:
        patient_ids = await get_all_patient_ids(conn)
        logger.info("calendar_reminders.start", patient_count=len(patient_ids))
        total_reminders = 0

        for patient_id in patient_ids:
            try:
                total_reminders += await _remind_for_patient(conn, patient_id)
            except Exception as exc:
                logger.error(
                    "calendar_reminders.patient_error",
                    patient_id=str(patient_id),
                    error=str(exc),
                )

        logger.info("calendar_reminders.done", reminders_sent=total_reminders)


async def _remind_for_patient(conn, patient_id) -> int:
    cal_repo = CalendarEventRepository(conn)
    notif_repo = NotificationRepository(conn)
    
    # Escalation levels from System Design
    # (days_offset, label, recipient, tone)
    ESCALATIONS = [
        (14, "T-14", "meera", "info"),
        (10, "T-10", "meera", "normal"),
        (7, "T-7", "caregiver", "normal"),
        (5, "T-5", "meera", "urgent"),
        (3, "T-3", "meera", "alert"),
        (1, "T-1", "meera", "alert"),
    ]
    
    user_id = await get_user_id_for_patient(conn, patient_id)
    if not user_id:
        return 0

    sent_count = 0
    today = date.today()

    for days, label, recipient, tone in ESCALATIONS:
        target_date = today + timedelta(days=days)
        
        # Get confirmed events for this specific offset that haven't sent this reminder label
        rows = await conn.fetch(
            """
            SELECT * FROM public.calendar_events
            WHERE patient_id = $1
              AND event_date = $2
              AND status = 'confirmed'
              AND NOT ($3 = ANY(COALESCE(reminder_sent_at, ARRAY[]::text[])))
            """,
            patient_id, target_date, label
        )

        for row in rows:
            event_id = row["id"]
            title = row["title"]
            event_type = row["event_type"]
            type_label = "appointment" if event_type == "appointment" else "lab test"
            
            # Construct message
            if days == 1:
                msg_title = f"FINAL ALERT: {type_label.upper()} TOMORROW"
                msg_body = f"Tomorrow: {title}. Please ensure all prep/tests are complete."
            elif days == 3:
                msg_title = f"URGENT: {type_label.capitalize()} in 3 days"
                msg_body = f"Appointment on {target_date}: {title}. Have you done the required tests?"
            elif days == 7:
                msg_title = f"Reminder: {type_label.capitalize()} next week"
                msg_body = f"Scheduled for {target_date}: {title}."
            else:
                msg_title = f"Upcoming {type_label.capitalize()} ({label})"
                msg_body = f"{title} scheduled for {target_date} ({days} days away)."

            # 1. Recipient: Caregiver (T-7 only)
            if recipient == "caregiver":
                from app.repositories.caregiver_repository import CaregiverRepository
                from app.worker.jobs._helpers import send_whatsapp_to_phone
                cg_repo = CaregiverRepository(conn)
                caregivers = await cg_repo.get_by_patient_id(patient_id, active_only=True)
                
                for cg in caregivers:
                    cg_msg = f"CareCircle Reminder: {title} for the patient on {target_date}. Please prepare for the visit."
                    await send_whatsapp_to_phone(cg.phone_number, cg_msg)
            
            # 2. Recipient: Meera (All levels)
            # Create in-app notification record
            await notif_repo.create(
                patient_id=patient_id,
                recipient_user_id=user_id,
                type="calendar_reminder",
                channel="push",
                title=msg_title,
                body=msg_body,
                linked_entity_type="calendar_event",
                linked_entity_id=event_id,
            )

            # Route by channel/tone
            if tone == "alert" or days <= 3:
                # Direct WhatsApp + Push for high urgency
                from app.worker.jobs._helpers import try_push, try_whatsapp
                await try_push(conn, user_id, msg_title, msg_body, data={"type": "calendar_reminder", "event_id": str(event_id)})
                await try_whatsapp(conn, user_id, f"* {msg_title} *\n\n{msg_body}")
            elif days == 10:
                # T-10 is specifically a Push according to design
                from app.worker.jobs._helpers import try_push
                await try_push(conn, user_id, msg_title, msg_body, data={"type": "calendar_reminder", "event_id": str(event_id)})
                # Also WhatsApp as a fallback for high reliability
                from app.worker.jobs._helpers import try_whatsapp
                await try_whatsapp(conn, user_id, f"CareCircle: {msg_body}")
            else:
                # Lower urgency: Push only
                from app.worker.jobs._helpers import try_push
                await try_push(conn, user_id, msg_title, msg_body)

            # 3. Mark as sent
            await cal_repo.add_reminder_sent(event_id, label)
            sent_count += 1
            
    return sent_count
