"""
Event dispatch — called by services when domain events occur.
Now uses HTTP POST to internal FastAPI endpoints to trigger background tasks,
avoiding the need for a separate Celery worker process.
"""
import httpx
from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _post_event(endpoint: str, params: dict) -> None:
    """Helper to send a synchronous POST to the internal API."""
    url = f"{settings.internal_base_url}/internal/events/{endpoint}"
    headers = {"x-internal-secret": settings.internal_secret}
    try:
        # Use a relatively short timeout to avoid blocking the caller too long
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, params=params, headers=headers)
            resp.raise_for_status()
    except Exception as exc:
        logger.error(f"event_dispatch_failed.{endpoint}", error=str(exc), url=url)


def on_document_uploaded(document_id: str) -> None:
    """Document uploaded to storage → trigger AI extraction (Layer 1)."""
    _post_event("document-uploaded", {"document_id": document_id})
    logger.info("event.on_document_uploaded", document_id=document_id)


def on_document_approved(document_id: str, patient_id: str) -> None:
    """Document approved by user → embed chunks + run pipeline in parallel."""
    _post_event("document-approved", {"document_id": document_id, "patient_id": patient_id})
    logger.info(
        "event.on_document_approved",
        document_id=document_id,
        patient_id=patient_id,
    )


def on_medication_added(patient_id: str) -> None:
    """New medication added → check interactions + rebuild patient_state."""
    _post_event("medication-added", {"patient_id": patient_id})
    logger.info("event.on_medication_added", patient_id=patient_id)


def on_pipeline_complete(patient_id: str) -> None:
    """Pipeline finished writing hypotheses → rebuild patient_state counts."""
    _post_event("pipeline-complete", {"patient_id": patient_id})
    logger.info("event.on_pipeline_complete", patient_id=patient_id)


def on_appointment_confirmed(patient_id: str) -> None:
    """Appointment confirmed → refresh patient_state (gap actions may have changed)."""
    _post_event("appointment-confirmed", {"patient_id": patient_id})
    logger.info("event.on_appointment_confirmed", patient_id=patient_id)
