from datetime import date, timedelta
from uuid import UUID

import asyncpg

from app.core.logging import get_logger
from app.models.calendar_event import CalendarEvent
from app.models.gap_action import GapAction
from app.repositories.calendar_event_repository import CalendarEventRepository
from app.repositories.gap_action_repository import GapActionRepository
from app.repositories.lab_result_repository import LabResultRepository

logger = get_logger(__name__)

# Required pre-visit tests per specialist type — hardcoded, extensible.
# Source: SystemDesign → Calendar & Gap Detection → Pre-Visit Test Requirements.
REQUIRED_TESTS: dict[str, list[str]] = {
    "cardiologist": ["ECG_report", "CBC", "serum_creatinine", "lipid_panel", "BP_log"],
    "endocrinologist": ["fasting_glucose", "HbA1c", "serum_creatinine", "urine_microalbumin"],
    "general_physician": ["CBC", "basic_metabolic_panel"],
    "neurologist": ["CBC", "basic_metabolic_panel", "serum_creatinine"],
    "nephrologist": ["serum_creatinine", "urine_microalbumin", "CBC", "basic_metabolic_panel"],
    "pulmonologist": ["CBC", "basic_metabolic_panel"],
    "gastroenterologist": ["CBC", "basic_metabolic_panel", "serum_creatinine"],
    "rheumatologist": ["CBC", "basic_metabolic_panel", "serum_creatinine"],
    "gynecologist": ["CBC", "basic_metabolic_panel", "serum_creatinine"],
    "dermatologist": ["CBC", "basic_metabolic_panel", "serum_creatinine"],
    "ophthalmologist": ["CBC", "basic_metabolic_panel", "serum_creatinine"],
    "otolaryngologist": ["CBC", "basic_metabolic_panel", "serum_creatinine"],
    "urologist": ["CBC", "basic_metabolic_panel", "serum_creatinine"],
    
}

# Test results must be from within this many days before the appointment to count as valid.
_TEST_VALIDITY_DAYS = 30

# Days before appointment where gap detection becomes urgent.
_URGENT_WITHIN_DAYS = 7
_WATCH_WITHIN_DAYS = 14


class GapDetectionAgent:
    """
    Reactive gap detector — triggered when an appointment is confirmed or extracted.

    Finds required pre-visit tests for the appointment's specialist type,
    checks the last result date for each test, and creates gap_actions for
    tests that are missing or too old.

    Called by IngestionOrchestrator after CalendarWriterAgent creates an event,
    and by the worker.events.on_appointment_confirmed handler.
    """

    def __init__(self, conn: asyncpg.Connection) -> None:
        self._conn = conn
        self._lab_repo = LabResultRepository(conn)
        self._gap_repo = GapActionRepository(conn)
        self._calendar_repo = CalendarEventRepository(conn)

    async def run(
        self,
        *,
        appointment: CalendarEvent,
        patient_id: UUID,
    ) -> list[GapAction]:
        """
        Check required tests for this appointment and create gap_actions for missing ones.
        Returns list of newly created GapAction records.
        """
        specialist = appointment.specialist_type
        if not specialist:
            logger.info(
                "gap_detection_agent.skip",
                event_id=str(appointment.id),
                reason="no specialist_type",
            )
            return []

        required = REQUIRED_TESTS.get(specialist)
        if not required:
            logger.info(
                "gap_detection_agent.skip",
                specialist=specialist,
                reason="no required tests defined for specialist",
            )
            return []

        appointment_date = appointment.event_date
        days_until = (appointment_date - date.today()).days

        # Only run gap detection when appointment is within 30 days
        if days_until > 30:
            logger.info(
                "gap_detection_agent.skip",
                event_id=str(appointment.id),
                days_until=days_until,
                reason="appointment more than 30 days away",
            )
            return []

        created: list[GapAction] = []

        for test_name in required:
            latest = await self._lab_repo.get_latest_by_test(patient_id, test_name)

            # Test is valid if it was done within validity window before appointment
            validity_cutoff = appointment_date - timedelta(days=_TEST_VALIDITY_DAYS)
            test_is_valid = (
                latest is not None
                and latest.test_date >= validity_cutoff
            )

            if test_is_valid:
                logger.info(
                    "gap_detection_agent.test_ok",
                    test=test_name,
                    last_date=str(latest.test_date),
                )
                continue

            # Check if gap_action already exists for this test + appointment
            existing = await self._gap_repo.get_by_appointment(appointment.id)
            already_exists = any(
                g.test_name == test_name and g.status not in ("completed", "cancelled")
                for g in existing
            )
            if already_exists:
                continue

            urgency = self._urgency_from_days(days_until)
            
            # The user wants tests done 1 week before the visit if possible.
            # We'll set the due_by to 1 week before, but no later than 2 days before.
            due_by = appointment_date - timedelta(days=7)
            if due_by < date.today():
                due_by = appointment_date - timedelta(days=2)
            if due_by < date.today():
                due_by = date.today()

            gap = await self._gap_repo.create(
                patient_id=patient_id,
                action_type="schedule_test",
                test_name=test_name,
                for_appointment_id=appointment.id,
                due_by=due_by,
                responsible_party="meera",
                urgency=urgency,
            )
            created.append(gap)

            # ALSO create a suggested calendar event for the test
            test_title = f"Required Test: {test_name.replace('_', ' ').title()} (for {appointment.title})"
            await self._calendar_repo.create(
                patient_id=patient_id,
                event_type="lab_test",
                title=test_title,
                event_date=due_by,
                source="gap_detection",
                notes=f"This test is required before your appointment with the {specialist.replace('_', ' ').title()}.",
                status="suggested"
            )

            logger.info(
                "gap_detection_agent.gap_created",
                test=test_name,
                urgency=urgency,
                due_by=str(due_by),
                appointment=str(appointment.id),
            )

        logger.info(
            "gap_detection_agent.complete",
            appointment=str(appointment.id),
            specialist=specialist,
            gaps_created=len(created),
        )
        return created

    @staticmethod
    def _urgency_from_days(days_until: int) -> str:
        """Map days-until-appointment to urgency level."""
        if days_until <= _URGENT_WITHIN_DAYS:
            return "alert"
        if days_until <= _WATCH_WITHIN_DAYS:
            return "watch"
        return "inform"
