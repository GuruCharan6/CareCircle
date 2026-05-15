"""
Staleness Check — 8:00 PM IST daily.

Triggers rebuild_patient_state for every patient.
Keeps patient_state.staleness_status accurate even when no new documents arrive.
Runs late evening so morning digest reflects fresh staleness scores.
"""
import asyncio

from app.core.celery import celery_app
from app.core.logging import get_logger
from app.worker._db import worker_conn
from app.worker.jobs._helpers import get_all_patient_ids
from app.config import settings
import httpx

logger = get_logger(__name__)


@celery_app.task(name="staleness_check")
def staleness_check() -> None:
    asyncio.run(_async_run())


async def _async_run() -> None:
    # Only need DB to get patient IDs — actual rebuild runs as separate tasks
    async with worker_conn(max_size=2, command_timeout=30) as conn:
        patient_ids = await get_all_patient_ids(conn)

    logger.info("staleness_check.dispatching", patient_count=len(patient_ids))

    async with httpx.AsyncClient(timeout=10) as client:
        for patient_id in patient_ids:
            try:
                await client.post(
                    f"{settings.internal_base_url}/internal/events/pipeline-complete",
                    params={"patient_id": str(patient_id)},
                    headers={"x-internal-secret": settings.internal_secret},
                )
            except Exception as exc:
                logger.error("staleness_check.dispatch_failed", patient_id=str(patient_id), error=str(exc))

    logger.info("staleness_check.done", dispatched=len(patient_ids))
