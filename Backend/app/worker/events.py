"""
Event dispatch — called by services when domain events occur.
Import these functions from services; never import Celery tasks directly.
Lazy imports inside each function prevent circular import at module load time.
"""
from app.core.logging import get_logger

logger = get_logger(__name__)


def on_document_uploaded(document_id: str) -> None:
    """Document uploaded to storage → trigger AI extraction (Layer 1)."""
    from app.worker.tasks.extract_document import extract_document

    extract_document.delay(document_id)
    logger.info("event.on_document_uploaded", document_id=document_id)


def on_document_approved(document_id: str, patient_id: str) -> None:
    """Document approved by user → embed chunks + run pipeline in parallel."""
    from app.worker.tasks.embed_document import embed_document
    from app.worker.tasks.run_pipeline import run_pipeline

    embed_document.delay(document_id, patient_id)
    run_pipeline.delay(document_id, patient_id)
    logger.info(
        "event.on_document_approved",
        document_id=document_id,
        patient_id=patient_id,
    )


def on_medication_added(patient_id: str) -> None:
    """New medication added → check interactions + rebuild patient_state."""
    from app.worker.tasks.check_drug_interactions import check_drug_interactions
    from app.worker.tasks.rebuild_patient_state import rebuild_patient_state

    check_drug_interactions.delay(patient_id)
    rebuild_patient_state.delay(patient_id)
    logger.info("event.on_medication_added", patient_id=patient_id)


def on_pipeline_complete(patient_id: str) -> None:
    """Pipeline finished writing hypotheses → rebuild patient_state counts."""
    from app.worker.tasks.rebuild_patient_state import rebuild_patient_state

    rebuild_patient_state.delay(patient_id)
    logger.info("event.on_pipeline_complete", patient_id=patient_id)


def on_appointment_confirmed(patient_id: str) -> None:
    """Appointment confirmed → refresh patient_state (gap actions may have changed)."""
    from app.worker.tasks.rebuild_patient_state import rebuild_patient_state

    rebuild_patient_state.delay(patient_id)
    logger.info("event.on_appointment_confirmed", patient_id=patient_id)
