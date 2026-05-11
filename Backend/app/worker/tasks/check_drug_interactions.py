import asyncio
from uuid import UUID

from app.agents.drug_interaction_manager import DrugInteractionManager
from app.core.celery import celery_app
from app.core.logging import get_logger
from app.worker._db import worker_conn

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    name="check_drug_interactions",
    max_retries=3,
    default_retry_delay=120,
)
def check_drug_interactions(self, patient_id: str) -> None:
    try:
        asyncio.run(_async_check(patient_id))
    except Exception as exc:
        logger.error("check_drug_interactions.failed", patient_id=patient_id, error=str(exc))
        raise self.retry(exc=exc)


async def _async_check(patient_id: str) -> None:
    # Delegate to DrugInteractionManager:
    #   - parallel LLM fan-out for all uncached drug pairs
    #   - lab-value modifiers (creatinine, glucose trend)
    #   - stores results + emits alert notifications
    async with worker_conn(max_size=3, command_timeout=180) as conn:
        manager = DrugInteractionManager(conn)
        results = await manager.run(patient_id=UUID(patient_id))
        logger.info(
            "check_drug_interactions.done",
            patient_id=patient_id,
            pairs_checked=len(results),
        )
