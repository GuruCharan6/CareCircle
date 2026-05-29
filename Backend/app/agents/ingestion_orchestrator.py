from uuid import UUID

import asyncpg

from app.agents.calendar_writer_agent import CalendarWriterAgent
from app.agents.gap_detection_agent import GapDetectionAgent
from app.agents.surface_agent import SurfaceAgent
from app.core.logging import get_logger
from app.pipeline.layer5_reason.types import ThreePartOutput
from app.pipeline.orchestrator import PipelineOrchestrator
from app.providers.llm.base import LLMProvider
from app.repositories.document_repository import DocumentRepository
from app.repositories.patient_state_repository import PatientStateRepository

logger = get_logger(__name__)


class IngestionOrchestrator:
    """
    Coordinates everything that happens after a document is approved.

    Replaces calling PipelineOrchestrator directly in the run_pipeline Celery task.

    Flow (from SystemDesign Agent Architecture):
      document_approved
        → run five-layer pipeline (Layer 1–5, sequential handoff)
        → [if prescription or doctor_note with follow-up date]:
              CalendarWriterAgent → creates suggested calendar_event
              GapDetectionAgent  → creates gap_actions for required tests
        → SurfaceAgent           → routes ThreePartOutput to notification channel

    Drug interactions are NOT triggered here — they fire via on_medication_added
    event (worker/events.py) when the medication service stores a new medication row.
    This avoids double-firing on the same DB connection.

    conn must be service_role — pipeline and agents write to DB on behalf of system.
    """

    def __init__(self, conn: asyncpg.Connection, llm: LLMProvider) -> None:
        self._conn = conn
        self._llm = llm
        self._doc_repo = DocumentRepository(conn)
        self._pipeline = PipelineOrchestrator(conn, llm)
        self._calendar_agent = CalendarWriterAgent(conn)
        self._gap_agent = GapDetectionAgent(conn)
        self._surface_agent = SurfaceAgent(conn)
        self._state_repo = PatientStateRepository(conn)

    async def run(
        self,
        *,
        document_id: UUID,
        patient_id: UUID,
    ) -> ThreePartOutput:
        """
        Run full post-approval flow. Returns ThreePartOutput from pipeline.

        Steps:
          1. Pipeline (layers 1–5) — always runs
          2. Calendar suggestion — runs for prescription / doctor_note with follow-up hint
          3. Gap detection — runs when calendar event was created for an appointment
          4. Surface routing — runs for alert + watch urgency; silent for inform
        """
        logger.info(
            "ingestion_orchestrator.start",
            document_id=str(document_id),
            patient_id=str(patient_id),
        )

        # Step 1: Five-layer pipeline
        output = await self._pipeline.run(
            document_id=document_id,
            patient_id=patient_id,
        )
        logger.info(
            "ingestion_orchestrator.pipeline_done",
            max_urgency=output.max_urgency,
        )

        # Write Layer 5 summary to patient_state.
        # upsert guarantees row creation if missing (update_summary is plain UPDATE — silent no-op otherwise).
        # overall_status="ok" is temporary — rebuild_patient_state (fired by on_pipeline_complete) corrects it.
        # COALESCE in upsert conflict clause preserves existing date fields; sets summary since it's non-null.
        if output.plain_summary:
            await self._state_repo.upsert(
                patient_id=patient_id,
                overall_status="ok",
                last_digest_summary=output.plain_summary,
            )

        # Step 2: Calendar event suggestion + lab report auto-complete
        # Load the document to inspect document_type and extracted_data
        document = await self._doc_repo.get_by_id(document_id)
        calendar_events = []

        # For lab reports: auto-complete matching pending lab_test calendar events
        if document and document.document_type == "lab_report":
            extracted = document.extracted_data or {}
            from datetime import datetime

            from app.lib.dates import parse_date_robust
            raw_test_date = extracted.get("test_date")
            test_date = parse_date_robust(raw_test_date) or datetime.utcnow().date()
            completed = await self._calendar_agent.auto_complete_from_lab_report(
                patient_id=patient_id,
                extracted=extracted,
                test_date=test_date,
            )
            if completed:
                logger.info(
                    "ingestion_orchestrator.lab_autocomplete",
                    completed_event_ids=completed,
                )

        if document and document.document_type in ("prescription", "doctor_note"):
            extracted = document.extracted_data or {}
            has_follow_up = any(
                extracted.get(key)
                for key in ("follow_up_date", "follow_up_weeks", "follow_up_days")
            )
            has_tests = len(extracted.get("ordered_tests") or []) > 0

            if has_follow_up or has_tests:
                # Build an IngestedItem-like view from the document for CalendarWriterAgent.
                # CalendarWriterAgent only needs extracted_data, source_type, is_prescription.
                from datetime import datetime

                from app.pipeline.layer1_ingest.types import IngestedItem

                synthetic_item = IngestedItem(
                    source_type="prescription" if document.document_type == "prescription" else "doctor_note",
                    source_document_id=document_id,
                    patient_id=patient_id,
                    event_time=document.event_date or datetime.utcnow().date(),
                    ingestion_time=datetime.utcnow(),
                    extracted_data=extracted,
                )
                calendar_events = await self._calendar_agent.run(
                    item=synthetic_item,
                    patient_id=patient_id,
                )
                logger.info(
                    "ingestion_orchestrator.calendar_done",
                    events_created=len(calendar_events),
                )

        # Step 3: Gap detection for any appointment events just created
        for event in calendar_events:
            if event.event_type == "appointment":
                gaps = await self._gap_agent.run(
                    appointment=event,
                    patient_id=patient_id,
                )
                logger.info(
                    "ingestion_orchestrator.gap_detection_done",
                    event_id=str(event.id),
                    gaps=len(gaps),
                )

        # Step 4: Surface routing — notify Meera based on urgency
        await self._surface_agent.route(output)
        logger.info(
            "ingestion_orchestrator.surface_done",
            urgency=output.max_urgency,
        )

        logger.info(
            "ingestion_orchestrator.complete",
            document_id=str(document_id),
            patient_id=str(patient_id),
        )
        return output
