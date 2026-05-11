import asyncio
from uuid import UUID

from app.core.celery import celery_app
from app.core.logging import get_logger
from app.lib.embedding import embed_and_store_document
from app.providers.llm.gemini import GeminiProvider
from app.worker._db import worker_conn

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    name="embed_document",
    max_retries=3,
    default_retry_delay=60,
)
def embed_document(self, document_id: str, patient_id: str) -> None:
    try:
        asyncio.run(_async_embed(document_id, patient_id))
    except Exception as exc:
        logger.error("embed_document.failed", document_id=document_id, error=str(exc))
        raise self.retry(exc=exc)


async def _async_embed(document_id: str, patient_id: str) -> None:
    async with worker_conn() as conn:
        row = await conn.fetchrow(
            """
            SELECT extracted_text, document_type
            FROM public.source_documents
            WHERE id = $1
            """,
            UUID(document_id),
        )
        if not row or not row["extracted_text"]:
            logger.warning("embed_document.no_text", document_id=document_id)
            return

        llm = GeminiProvider()
        chunk_count = await embed_and_store_document(
            source_document_id=UUID(document_id),
            patient_id=UUID(patient_id),
            text=row["extracted_text"],
            metadata={"document_type": row["document_type"]},
            conn=conn,
            llm=llm,
        )
        logger.info("embed_document.done", document_id=document_id, chunks=chunk_count)
