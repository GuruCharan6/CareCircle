"""
Daily Gap Detection — 6:00 AM IST daily.

For each patient, detect and create gap_action records:
1. Medications with refill due within 10 days (no confirmed refill) → 'refill_medication'
2. Confirmed appointments with pending required tests → 'schedule_test'

Skips duplicates — checks for existing pending gap_action with same entity.
"""
import asyncio
from datetime import date, timedelta
from uuid import UUID

from app.core.celery import celery_app
from app.core.logging import get_logger
from app.repositories.calendar_event_repository import CalendarEventRepository
from app.repositories.gap_action_repository import GapActionRepository
from app.repositories.medication_refill_repository import MedicationRefillRepository
from app.worker._db import worker_conn
from app.worker.jobs._helpers import get_all_patient_ids

logger = get_logger(__name__)

_REFILL_WARN_DAYS = 10
_TEST_WARN_DAYS = 14


@celery_app.task(name="daily_gap_detection")
def daily_gap_detection() -> None:
    asyncio.run(_async_run())


async def _async_run() -> None:
    async with worker_conn(max_size=5, command_timeout=60) as conn:
        patient_ids = await get_all_patient_ids(conn)
        logger.info("daily_gap_detection.start", patient_count=len(patient_ids))
        total_gaps = 0

        for patient_id in patient_ids:
            try:
                total_gaps += await _detect_for_patient(conn, patient_id)
            except Exception as exc:
                logger.error(
                    "daily_gap_detection.patient_error",
                    patient_id=str(patient_id),
                    error=str(exc),
                )

        logger.info("daily_gap_detection.done", total_gaps=total_gaps)


async def _detect_for_patient(conn, patient_id: UUID) -> int:
    refill_repo = MedicationRefillRepository(conn)
    cal_repo = CalendarEventRepository(conn)
    gap_repo = GapActionRepository(conn)

    today = date.today()
    gap_count = 0

    # --- Refill gaps ---
    due_refills = await refill_repo.get_due_soon(patient_id, within_days=_REFILL_WARN_DAYS)
    existing_gaps = await gap_repo.get_pending_by_patient(patient_id)
    existing_med_ids = {
        str(g.medication_id)
        for g in existing_gaps
        if g.action_type == "refill_medication" and g.medication_id
    }

    for refill in due_refills:
        if str(refill.medication_id) in existing_med_ids:
            continue  # already tracked
        urgency = "alert" if refill.refill_due_date <= today + timedelta(days=3) else "watch"
        await gap_repo.create(
            patient_id=patient_id,
            action_type="refill_medication",
            due_by=refill.refill_due_date,
            responsible_party="caregiver",
            urgency=urgency,
            medication_id=refill.medication_id,
        )
        gap_count += 1

    # --- Test gaps: confirmed appointments with pending required tests ---
    upcoming = await cal_repo.get_upcoming(
        patient_id, within_days=_TEST_WARN_DAYS, status="confirmed"
    )
    existing_appt_ids = {
        str(g.for_appointment_id)
        for g in existing_gaps
        if g.action_type == "schedule_test" and g.for_appointment_id
    }

    for event in upcoming:
        if not event.required_tests:
            continue
        if str(event.id) in existing_appt_ids:
            continue
        tests_done = event.tests_status or {}
        pending_tests = [t for t in event.required_tests if not tests_done.get(t)]
        if not pending_tests:
            continue
        await gap_repo.create(
            patient_id=patient_id,
            action_type="schedule_test",
            due_by=event.event_date - timedelta(days=2),  # 2 days before appointment
            responsible_party="meera",
            urgency="watch",
            test_name=", ".join(pending_tests[:3]),
            for_appointment_id=event.id,
        )
        gap_count += 1

    return gap_count
