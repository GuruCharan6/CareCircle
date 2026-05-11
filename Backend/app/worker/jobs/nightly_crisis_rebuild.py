"""
Nightly Crisis Rebuild — 2:00 AM IST daily.

Rebuilds crisis_packets for every patient:
- Current active medications (brand, generic, dose, frequency)
- Known allergies and blood type
- Emergency contacts (family user + confirmed caregivers)
- Active alert hypothesis texts

Crisis packet is a read-optimized snapshot for emergency situations.
Doctor/paramedic can access it without navigating full medical record.
"""
import asyncio
from datetime import datetime, timezone

from app.cache.crisis_packet_cache import set_crisis_packet
from app.core.celery import celery_app
from app.core.logging import get_logger
from app.services.crisis_service import CrisisService
from app.worker._db import worker_conn
from app.worker.jobs._helpers import get_all_patient_ids

logger = get_logger(__name__)

@celery_app.task(name="nightly_crisis_rebuild")
def nightly_crisis_rebuild() -> None:
    asyncio.run(_async_run())

async def _async_run() -> None:
    async with worker_conn(max_size=5, command_timeout=120) as conn:
        patient_ids = await get_all_patient_ids(conn)
        logger.info("nightly_crisis_rebuild.start", patient_count=len(patient_ids))
        
        svc = CrisisService(conn)

        for patient_id in patient_ids:
            try:
                await svc.rebuild_packet(patient_id, trigger="scheduled_nightly")
            except Exception as exc:
                logger.error(
                    "nightly_crisis_rebuild.patient_error",
                    patient_id=str(patient_id),
                    error=str(exc),
                )

        logger.info("nightly_crisis_rebuild.done", patient_count=len(patient_ids))
