from datetime import date, timedelta
from uuid import UUID

import asyncpg

from app.core.logging import get_logger
from app.pipeline.layer1_ingest import ingest
from app.pipeline.layer2_normalize import normalize
from app.pipeline.layer3_enrich import PatientContext, run_enrichment, write_hypotheses
from app.pipeline.layer4_reconcile import classify_conflicts
from app.pipeline.layer4_reconcile.types import ClassifiedConflict
from app.pipeline.layer5_reason import ReasoningInput, ThreePartOutput, format_three_part_output
from app.providers.llm.base import LLMProvider
from app.repositories.conflict_record_repository import ConflictRecordRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.lab_result_repository import LabResultRepository
from app.repositories.medication_repository import MedicationRepository
from app.repositories.observation_repository import ObservationRepository
from app.repositories.patient_repository import PatientRepository

logger = get_logger(__name__)

_RECENT_LAB_DAYS = 90
_RECENT_OBS_DAYS = 14


class PipelineOrchestrator:
    """
    Runs the five-layer processing pipeline for one approved document.

    Flow: ingest → normalize → enrich → reconcile → reason → write to DB.

    conn must be service_role (bypasses RLS) — pipeline writes hypotheses
    and conflict records on behalf of the system, not the user.
    """

    def __init__(self, conn: asyncpg.Connection, llm: LLMProvider) -> None:
        self._conn = conn
        self._llm = llm

    async def run(
        self,
        *,
        document_id: UUID,
        patient_id: UUID,
    ) -> ThreePartOutput:
        """
        Run full pipeline for one document.
        Returns ThreePartOutput (Layer 5 result) for immediate use.
        Hypotheses and conflicts are written to DB as side effects.
        """
        logger.info(
            "pipeline.start",
            document_id=str(document_id),
            patient_id=str(patient_id),
        )

        # --- Load document ---
        doc_repo = DocumentRepository(self._conn)
        document = await doc_repo.get_by_id(document_id)
        if document is None:
            raise ValueError(f"Document {document_id} not found")
        if document.user_approved_at is None:
            raise ValueError(f"Document {document_id} not approved — pipeline requires approval")

        # --- Layer 1: Ingest ---
        item = await ingest(document, self._llm)
        logger.info("pipeline.layer1_done", source_type=item.source_type)

        # --- Layer 2: Normalize ---
        normalized = normalize(item)
        logger.info("pipeline.layer2_done", dimension=normalized.profile.dimension)

        # --- Fetch patient context for Layer 3 ---
        context = await self._build_patient_context(patient_id)

        # --- Layer 3: Enrich (deterministic rules, no AI) ---
        hypotheses = run_enrichment(normalized, context)
        written_count = await write_hypotheses(hypotheses, self._conn)
        logger.info("pipeline.layer3_done", hypotheses_written=written_count)

        # --- Fetch recent normalized items for Layer 4 context ---
        recent_obs = context.recent_observations

        # --- Layer 4: Reconcile ---
        conflicts = classify_conflicts(
            normalized,
            recent_observations=recent_obs,
            recent_normalized_items=[],  # Phase 8+ will pass cached normalized history
        )
        await self._write_conflicts(conflicts)
        logger.info("pipeline.layer4_done", conflicts=len(conflicts))

        # --- Layer 5: Reason (LLM translates, never generates) ---
        patient = context.patient
        reasoning_input = ReasoningInput(
            patient_id=patient_id,
            patient_name=patient.name,
            known_conditions=patient.known_conditions or [],
            hypotheses=hypotheses,
            conflicts=conflicts,
            source_type=normalized.source_type,
            dimension=normalized.profile.dimension,
        )
        output = await format_three_part_output(reasoning_input, self._llm)
        logger.info(
            "pipeline.layer5_done",
            max_urgency=output.max_urgency,
            known_facts=len(output.known_facts),
        )

        logger.info(
            "pipeline.complete",
            document_id=str(document_id),
            patient_id=str(patient_id),
            max_urgency=output.max_urgency,
        )
        return output

    async def _build_patient_context(self, patient_id: UUID) -> PatientContext:
        patient_repo = PatientRepository(self._conn)
        med_repo = MedicationRepository(self._conn)
        lab_repo = LabResultRepository(self._conn)
        obs_repo = ObservationRepository(self._conn)

        patient = await patient_repo.get_by_id(patient_id)
        if patient is None:
            raise ValueError(f"Patient {patient_id} not found")

        active_meds = await med_repo.get_active_by_patient(patient_id)
        recent_labs = await lab_repo.get_by_patient_id(patient_id, limit=100)
        recent_obs = await obs_repo.get_by_patient_id(patient_id, limit=50)

        # Filter to time windows.
        lab_cutoff = date.today() - timedelta(days=_RECENT_LAB_DAYS)
        obs_cutoff = date.today() - timedelta(days=_RECENT_OBS_DAYS)

        recent_labs = [lr for lr in recent_labs if lr.test_date >= lab_cutoff]
        recent_obs = [o for o in recent_obs if o.observation_date >= obs_cutoff]

        return PatientContext(
            patient=patient,
            active_medications=active_meds,
            recent_lab_results=recent_labs,
            recent_observations=recent_obs,
        )

    async def _write_conflicts(self, conflicts: list[ClassifiedConflict]) -> None:
        repo = ConflictRecordRepository(self._conn)
        for c in conflicts:
            await repo.create(
                patient_id=c.patient_id,
                conflict_type=c.conflict_type,
                source_a_type=c.source_a_type,
                source_a_id=c.source_a_id,
                source_a_dimension=c.source_a_dimension,
                source_b_type=c.source_b_type,
                source_b_id=c.source_b_id,
                source_b_dimension=c.source_b_dimension,
                conflict_description=c.conflict_description,
                is_resolvable=c.is_resolvable,
                meera_suggested_action=c.meera_suggested_action,
            )
