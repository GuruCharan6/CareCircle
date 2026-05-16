"""
Event dispatch — called by services when domain events occur.
Schedules async background tasks directly into the running event loop.
No HTTP self-calls — avoids deadlocks under single-worker deployments.
"""
import asyncio

from app.core.logging import get_logger

logger = get_logger(__name__)


def _fire(coro) -> None:
    """Schedule a coroutine as a fire-and-forget task."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(coro)
        else:
            loop.run_until_complete(coro)
    except RuntimeError:
        asyncio.run(coro)


def on_document_uploaded(document_id: str) -> None:
    from app.worker.tasks.extract_document import _async_extract
    _fire(_async_extract(document_id))
    logger.info("event.on_document_uploaded", document_id=document_id)


def on_document_approved(document_id: str, patient_id: str) -> None:
    from app.worker.tasks.embed_document import _async_embed
    from app.worker.tasks.run_pipeline import _async_run
    _fire(_async_embed(document_id, patient_id))
    _fire(_async_run(document_id, patient_id))
    logger.info(
        "event.on_document_approved",
        document_id=document_id,
        patient_id=patient_id,
    )


def on_medication_added(patient_id: str) -> None:
    from app.worker.tasks.check_drug_interactions import _async_check
    from app.worker.tasks.rebuild_patient_state import _async_rebuild
    _fire(_async_check(patient_id))
    _fire(_async_rebuild(patient_id))
    logger.info("event.on_medication_added", patient_id=patient_id)


def on_pipeline_complete(patient_id: str) -> None:
    from app.worker.tasks.rebuild_patient_state import _async_rebuild
    _fire(_async_rebuild(patient_id))
    logger.info("event.on_pipeline_complete", patient_id=patient_id)


def on_appointment_confirmed(patient_id: str) -> None:
    from app.worker.tasks.rebuild_patient_state import _async_rebuild
    _fire(_async_rebuild(patient_id))
    logger.info("event.on_appointment_confirmed", patient_id=patient_id)
