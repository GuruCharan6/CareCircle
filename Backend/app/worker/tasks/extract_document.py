import asyncio
from typing import Any
from uuid import UUID

import httpx

from app.config import settings
from app.core.celery import celery_app
from app.core.logging import get_logger
from app.lib.signed_url import create_signed_view_url
from app.pipeline.layer1_ingest import ingest
from app.providers.llm.gemini import GeminiProvider
from app.providers.transcription.saravam import SaravamClient
from app.repositories.document_repository import DocumentRepository
from app.worker._db import worker_conn

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    name="extract_document",
    max_retries=3,
    default_retry_delay=30,
)
def extract_document(self, document_id: str) -> None:
    try:
        asyncio.run(_async_extract(document_id))
    except Exception as exc:
        logger.error("extract_document.failed", document_id=document_id, error=str(exc))
        raise self.retry(exc=exc)


async def _async_extract(document_id: str) -> None:
    doc_uuid = UUID(document_id)
    async with worker_conn() as conn:
        doc_repo = DocumentRepository(conn)
        document = await doc_repo.get_by_id(doc_uuid)

        if not document:
            logger.error("extract_document.not_found", document_id=document_id)
            return

        # Update status to extracting
        await doc_repo.update_extraction(doc_uuid, extraction_status="extracting")

        logger.info("extract_document.doc_loaded", document_id=document_id,
                    doc_type=document.document_type, file_url=document.file_url,
                    mime_type=document.file_mime_type)
        try:
            # Handle Voice Note Transcription if needed
            if document.document_type == "voice_note" and not document.extracted_text:
                logger.info("extract_document.transcribing", document_id=document_id)
                bucket = settings.supabase_storage_bucket_documents
                signed_url = create_signed_view_url(bucket, document.file_url)

                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.get(signed_url)
                    resp.raise_for_status()
                    audio_bytes = resp.content

                stt = SaravamClient()
                transcript = await stt.transcribe_bytes(audio_bytes, document.file_mime_type)

                # Update document with transcript immediately
                updated_doc = await doc_repo.update_extraction(
                    doc_uuid,
                    extraction_status="extracting",
                    extracted_text=transcript
                )
                if updated_doc:
                    document = updated_doc
                logger.info("extract_document.transcription_done", document_id=document_id)

            # Voice NLP uses cheaper flash-8b — transcript already clean English from Sarvam
            # All other doc types (prescriptions, labs) use default model for vision accuracy
            llm = GeminiProvider()
            # Layer 1 Ingest: AI Vision/OCR/STT
            ingested_item = await ingest(document, llm)

            # Save extraction results. Don't change document_type for voice_note —
            # the UNION ALL in observation_repository and the pipeline _EXTRACTORS dict
            # both depend on it staying "voice_note".
            update_kwargs: dict[str, Any] = dict(
                extraction_status="review_required",
                extracted_text=ingested_item.raw_text,
                extracted_data=ingested_item.extracted_data,
                field_confidence=ingested_item.confidence_per_field,
            )
            if document.document_type != "voice_note":
                update_kwargs["document_type"] = ingested_item.source_type

            await doc_repo.update_extraction(doc_uuid, **update_kwargs)
            logger.info("extract_document.success", document_id=document_id)
        except Exception as e:
            await doc_repo.update_extraction(doc_uuid, extraction_status="failed")
            logger.error("extract_document.processing_failed", document_id=document_id, error=str(e))
            raise e
