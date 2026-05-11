import asyncio
from uuid import UUID

from app.core.celery import celery_app
from app.core.logging import get_logger
from app.agents.ingestion_orchestrator import IngestionOrchestrator
from app.providers.llm.gemini import GeminiProvider
from app.worker._db import worker_conn

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    name="run_pipeline",
    max_retries=3,
    default_retry_delay=30,
)
def run_pipeline(self, document_id: str, patient_id: str) -> None:
    try:
        asyncio.run(_async_run(document_id, patient_id))
    except Exception as exc:
        logger.error("run_pipeline.failed", document_id=document_id, error=str(exc))
        raise self.retry(exc=exc)


async def _async_run(document_id: str, patient_id: str) -> None:
    # IngestionOrchestrator runs pipeline + calendar + gap detection + surface routing
    async with worker_conn(max_size=5, command_timeout=120) as conn:
        llm = GeminiProvider()
        orchestrator = IngestionOrchestrator(conn, llm)
        output = await orchestrator.run(
            document_id=UUID(document_id),
            patient_id=UUID(patient_id),
        )
        logger.info(
            "run_pipeline.done",
            document_id=document_id,
            max_urgency=output.max_urgency,
            facts=len(output.known_facts),
        )

    # Rebuild patient_state counts after connection released — avoids nested pool contention
    from app.worker.events import on_pipeline_complete
    on_pipeline_complete(patient_id)
