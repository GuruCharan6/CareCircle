import re
from datetime import date, timedelta
from uuid import UUID

import asyncpg

from app.core.logging import get_logger
from app.models.calendar_event import CalendarEvent
from app.pipeline.layer1_ingest.types import IngestedItem
from app.repositories.calendar_event_repository import CalendarEventRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.patient_repository import PatientRepository

logger = get_logger(__name__)

# Vital signs that should never be scheduled as lab tests.
# Gemini sometimes extracts vitals recorded at visit as "ordered investigations".
_VITAL_SIGNS: frozenset[str] = frozenset({
    "bp", "blood pressure", "hr", "heart rate", "pulse", "pulse rate",
    "spo2", "oxygen saturation", "o2 saturation", "temperature", "temp",
    "weight", "height", "bmi", "bsa", "respiratory rate", "rr",
    "ef", "ejection fraction", "lvef",
    "sbp", "dbp", "systolic", "diastolic",
})

# Map prescriber specialty strings to canonical specialist_type values.
# Covers common variations from extracted prescription data.
_SPECIALTY_MAP: dict[str, str] = {
    "cardiology": "cardiologist",
    "cardiologist": "cardiologist",
    "cardiac": "cardiologist",
    "heart": "cardiologist",
    "endocrinology": "endocrinologist",
    "endocrinologist": "endocrinologist",
    "diabetes": "endocrinologist",
    "diabetologist": "endocrinologist",
    "general": "general_physician",
    "general physician": "general_physician",
    "gp": "general_physician",
    "medicine": "general_physician",
    "neurology": "neurologist",
    "neurologist": "neurologist",
    "nephrology": "nephrologist",
    "nephrologist": "nephrologist",
    "kidney": "nephrologist",
    "pulmonology": "pulmonologist",
    "pulmonologist": "pulmonologist",
    "chest": "pulmonologist",
}


def _resolve_specialist(raw: str | None) -> str | None:
    if not raw:
        return None
    return _SPECIALTY_MAP.get(raw.lower().strip())


class CalendarWriterAgent:
    """
    Extracts follow-up date hints from an IngestedItem and creates suggested
    calendar_events. Never auto-confirms — status always starts as 'suggested'.

    Writes an in_app notification prompting Meera to confirm or dismiss.

    Triggered by IngestionOrchestrator after pipeline completes, for prescription
    and doctor_note document types. Automatically schedules confirmed events.
    """

    def __init__(self, conn: asyncpg.Connection) -> None:
        self._conn = conn
        self._calendar_repo = CalendarEventRepository(conn)
        self._notification_repo = NotificationRepository(conn)
        self._patient_repo = PatientRepository(conn)

    async def run(
        self,
        *,
        item: IngestedItem,
        patient_id: UUID,
    ) -> list[CalendarEvent]:
        """
        Inspect extracted_data for follow-up date signals and create suggested events.
        Returns list of newly created CalendarEvent records.
        """
        created: list[CalendarEvent] = []
        extracted = item.extracted_data or {}

        # Use item.event_time (prescription/note date) as the base for relative offsets
        follow_up_date, is_explicit_date = self._resolve_follow_up_date(extracted, base_date=item.event_time)

        patient = await self._patient_repo.get_by_id(patient_id)
        if not patient:
            logger.error("calendar_writer_agent.patient_not_found", patient_id=str(patient_id))
            return []

        # 1. Handle Follow-up Appointment
        if follow_up_date:
            specialist_type = _resolve_specialist(
                extracted.get("specialist_type")
                or extracted.get("prescriber_specialty")
            )

            # doctor_note prompt returns "doctor_name"; prescription returns "prescriber_name"
            prescriber = (
                extracted.get("prescriber_name")
                or extracted.get("doctor_name")
                or "your doctor"
            )
            title = self._build_title(prescriber, specialist_type)

            # Avoid duplicates: same specialist within ±14 days of follow_up_date.
            # 14-day window catches the case where a weeks-based estimate (e.g. +6 weeks = Jun 27)
            # differs from an explicit date (e.g. Jun 18) by 9 days — within the tolerance.
            #
            # Dedup logic:
            #   - Both have specialist_type → match on specialist_type (original behaviour)
            #   - Either is None → fall back to prescriber name match so two different doctors
            #     with an unresolved specialty don't falsely collapse into one event.
            prescriber_norm = prescriber.lower().strip()

            def _is_appointment_match(e: CalendarEvent) -> bool:
                if e.event_type != "appointment":
                    return False
                if e.status not in ("suggested", "confirmed"):
                    return False
                if abs((e.event_date - follow_up_date).days) > 14:
                    return False
                if specialist_type is not None and e.specialist_type is not None:
                    return e.specialist_type == specialist_type
                # One or both specialist_type values are None — match on prescriber name
                existing_prescriber = (
                    e.title.split(" — ", 1)[-1].lower().strip()
                    if " — " in e.title else ""
                )
                return bool(prescriber_norm) and prescriber_norm == existing_prescriber

            existing = await self._calendar_repo.get_upcoming(patient_id, within_days=180)
            existing_match = next((e for e in existing if _is_appointment_match(e)), None)

            if existing_match is None:
                event = await self._calendar_repo.create(
                    patient_id=patient_id,
                    event_type="appointment",
                    title=title,
                    event_date=follow_up_date,
                    source="prescription_ingestion" if item.is_prescription else "doctor_note_extraction",
                    specialist_type=specialist_type,
                    status="suggested",
                )
                created.append(event)

                # Notify Meera — one tap to confirm, one to dismiss
                weeks_hint = extracted.get("follow_up_weeks")
                hint = f"in {weeks_hint} weeks (around {follow_up_date})" if weeks_hint else str(follow_up_date)
                body = (
                    f"{prescriber} mentioned a follow-up {hint}. "
                    f"Tap to confirm or dismiss."
                )
                await self._notification_repo.create(
                    patient_id=patient_id,
                    recipient_user_id=patient.user_id,
                    type="calendar_reminder",
                    channel="in_app",
                    title="Follow-up appointment scheduled",
                    body=body,
                    linked_entity_type="calendar_event",
                    linked_entity_id=event.id,
                    action_deep_link=f"/calendar/{event.id}",
                )

                logger.info(
                    "calendar_writer_agent.event_created",
                    event_id=str(event.id),
                    date=str(follow_up_date),
                    specialist=specialist_type,
                )
            elif is_explicit_date and existing_match.event_date != follow_up_date:
                if existing_match.status == "suggested":
                    # Explicit date is more accurate than a weeks estimate.
                    # Safe to correct — user hasn't confirmed yet.
                    await self._calendar_repo.update_event_date(existing_match.id, follow_up_date)
                    created.append(existing_match)  # treat as "handled" for gap detection
                    logger.info(
                        "calendar_writer_agent.event_date_corrected",
                        event_id=str(existing_match.id),
                        old_date=str(existing_match.event_date),
                        new_date=str(follow_up_date),
                    )
                else:
                    # Existing event is confirmed (user-approved) — never mutate it.
                    # Different date means this is a genuinely new appointment; suggest it.
                    event = await self._calendar_repo.create(
                        patient_id=patient_id,
                        event_type="appointment",
                        title=title,
                        event_date=follow_up_date,
                        source="prescription_ingestion" if item.is_prescription else "doctor_note_extraction",
                        specialist_type=specialist_type,
                        status="suggested",
                    )
                    created.append(event)
                    weeks_hint = extracted.get("follow_up_weeks")
                    hint = f"in {weeks_hint} weeks (around {follow_up_date})" if weeks_hint else str(follow_up_date)
                    await self._notification_repo.create(
                        patient_id=patient_id,
                        recipient_user_id=patient.user_id,
                        type="calendar_reminder",
                        channel="in_app",
                        title="Follow-up appointment scheduled",
                        body=(
                            f"{prescriber} mentioned a follow-up {hint}. "
                            f"Tap to confirm or dismiss."
                        ),
                        linked_entity_type="calendar_event",
                        linked_entity_id=event.id,
                        action_deep_link=f"/calendar/{event.id}",
                    )
                    logger.info(
                        "calendar_writer_agent.event_created",
                        event_id=str(event.id),
                        date=str(follow_up_date),
                        specialist=specialist_type,
                        reason="existing confirmed event not mutated",
                    )
            else:
                logger.info(
                    "calendar_writer_agent.skip_appointment",
                    patient_id=str(patient_id),
                    reason="duplicate suggestion",
                    date=str(follow_up_date),
                )

        # 2. Handle explicit tests found in prescription / doctor note
        results = extracted.get("ordered_tests") or []

        # Fetch existing upcoming events once for dedup (same window as appointment check)
        existing_upcoming = await self._calendar_repo.get_upcoming(patient_id, within_days=180)
        already_scheduled_tests = {
            e.title.removeprefix("Lab Test: ").lower()
            for e in existing_upcoming
            if e.event_type == "lab_test" and e.status in ("suggested", "confirmed")
        }

        # Default test_date — 7 days before follow-up or 7 from today.
        # Individual tests may override this with their own due_date.
        today = date.today()
        if follow_up_date and follow_up_date > today:
            default_test_date = follow_up_date - timedelta(days=7)
        else:
            default_test_date = today + timedelta(days=7)
        default_test_date = max(default_test_date, today + timedelta(days=1))

        new_test_events: list = []
        for res in results:
            test_name = res.get("test_name_display") or res.get("test_name")
            if not test_name:
                continue

            # Reject vital signs — Gemini sometimes extracts visit vitals as ordered tests
            if test_name.lower().strip() in _VITAL_SIGNS:
                logger.info("calendar_writer_agent.skip_vital", test_name=test_name)
                continue

            if test_name.lower() in already_scheduled_tests:
                logger.info("calendar_writer_agent.skip_test", test_name=test_name, reason="duplicate")
                continue

            # Use per-test due_date if Gemini extracted one, else default
            from app.lib.dates import parse_date_robust
            raw_due = res.get("due_date")
            if raw_due:
                parsed_due = parse_date_robust(raw_due)
                if parsed_due and parsed_due > today:
                    # Schedule 7 days before the stated deadline so patient has time
                    test_date = max(parsed_due - timedelta(days=7), today + timedelta(days=1))
                else:
                    test_date = default_test_date
            else:
                test_date = default_test_date

            test_event = await self._calendar_repo.create(
                patient_id=patient_id,
                event_type="lab_test",
                title=f"Lab Test: {test_name}",
                event_date=test_date,
                source="prescription_ingestion",
                status="suggested",
            )
            created.append(test_event)
            new_test_events.append(test_event)
            logger.info("calendar_writer_agent.test_created", test_name=test_name, date=str(test_date))

        # One grouped notification for all new lab tests on this date (not one per test)
        if new_test_events and patient:
            names = ", ".join(
                e.title.removeprefix("Lab Test: ") for e in new_test_events
            )
            count = len(new_test_events)
            await self._notification_repo.create(
                patient_id=patient_id,
                recipient_user_id=patient.user_id,
                type="calendar_reminder",
                channel="in_app",
                title=f"{count} lab test{'s' if count > 1 else ''} suggested",
                body=(
                    f"Doctor ordered: {names}. "
                    f"Suggested for {new_test_events[0].event_date}. Tap to confirm or dismiss."
                ),
                linked_entity_type="calendar_event",
                linked_entity_id=new_test_events[0].id,
                action_deep_link="/calendar",
            )

        return created

    def _resolve_follow_up_date(self, extracted: dict, base_date: date | None = None) -> tuple[date | None, bool]:
        """
        Resolve a concrete follow-up date from multiple possible extracted fields.
        Priority: explicit date > weeks.

        base_date is the document issue date (may be in the past).
        We use max(base_date, today) so old prescriptions don't create past appointments.

        Returns: (resolved_date, is_explicit)
            is_explicit=True when the date came from follow_up_date field (not weeks estimate).
            Callers use is_explicit to decide whether to update existing events.
        """
        from app.lib.dates import parse_date_robust

        today = date.today()

        # 1. Explicit date string — highest priority
        raw_date = extracted.get("follow_up_date")
        if raw_date:
            parsed = parse_date_robust(raw_date)
            if parsed and parsed >= today:
                return parsed, True
            # Explicit date present but unparseable or past — do NOT fall through to weeks.
            # Falling through caused weeks-based estimates to override an explicit field.
            return None, False

        # Use latest of document date and today as base for relative offsets.
        # Prevents old prescriptions from scheduling past appointments.
        base = max(base_date, today) if base_date else today

        # 2. Weeks from base — Gemini may return int, float, or "6 weeks" string
        raw_weeks = extracted.get("follow_up_weeks")
        if raw_weeks is not None:
            match = re.search(r"[\d.]+", str(raw_weeks))
            if match:
                try:
                    return base + timedelta(weeks=float(match.group())), False
                except (ValueError, OverflowError):
                    pass

        return None, False

    async def auto_complete_from_lab_report(
        self,
        *,
        patient_id: UUID,
        extracted: dict,
        test_date: date,
    ) -> list[str]:
        """
        When a lab report is approved, find matching confirmed lab_test calendar events
        within ±3 days of test_date and mark them completed.

        Returns list of event IDs that were completed.
        """
        results = extracted.get("results") or []
        if not results:
            return []

        # Build set of normalized test names from the uploaded report
        uploaded_names = {
            (r.get("test_name") or "").lower().strip()
            for r in results
            if r.get("test_name")
        }
        if not uploaded_names:
            return []

        nearby = await self._calendar_repo.get_lab_tests_near_date(
            patient_id, test_date, days_before=7, days_after=14
        )
        completed_ids: list[str] = []
        for event in nearby:
            event_name = event.title.removeprefix("Lab Test: ").lower().strip()
            if event_name in uploaded_names:
                await self._calendar_repo.update_status(event.id, "completed")
                completed_ids.append(str(event.id))
                logger.info(
                    "calendar_writer_agent.auto_complete",
                    event_id=str(event.id),
                    test_name=event_name,
                    test_date=str(test_date),
                )

        return completed_ids

    @staticmethod
    def _build_title(prescriber: str, specialist_type: str | None) -> str:
        if specialist_type:
            label = specialist_type.replace("_", " ").title()
            return f"{label} follow-up — {prescriber}"
        return f"Follow-up — {prescriber}"
