from datetime import datetime, date, timezone
from app.pipeline.layer1_ingest.base import BaseExtractor
from app.pipeline.layer1_ingest.types import IngestedItem
from app.models.source_document import SourceDocument
from app.providers.llm.base import LLMProvider
from app.providers.vision.gemini_vision import GeminiVisionClient
from app.lib.signed_url import create_signed_view_url
from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Map from Gemini's document_type_guess values → extractor module
_KNOWN_TYPES = {"prescription", "lab_report", "doctor_note", "handwritten_note"}


class OtherExtractor(BaseExtractor):
    """
    Two-stage fallback extractor:
      Stage 1 — General Gemini prompt to detect document_type_guess.
      Stage 2 — Delegate to type-specific extractor for richer, accurate extraction.

    Avoids the original bug where general prompt results were used directly,
    causing poor field quality and wrong document_type defaulting to "doctor_note".
    """

    async def extract(
        self,
        document: SourceDocument,
        llm: LLMProvider | None = None,
    ) -> IngestedItem:
        vision = GeminiVisionClient()
        bucket = settings.supabase_storage_bucket_documents
        signed_url = create_signed_view_url(bucket, document.file_url)

        # ── Stage 1: Type detection ─────────────────────────────────────────
        try:
            data, field_confidence = await vision.extract_from_url(
                signed_url,
                document.file_mime_type,
                "other",
            )
            detected_type = (data.get("document_type_guess") or "").strip().lower()
            logger.info(
                "other_extractor.type_detected",
                doc_id=str(document.id),
                detected_type=detected_type or "unknown",
            )
        except Exception as e:
            logger.error("other_extractor.stage1_failed", doc_id=str(document.id), error=str(e))
            raise

        # ── Stage 2: Delegate to type-specific extractor ────────────────────
        if detected_type in _KNOWN_TYPES:
            try:
                from app.pipeline.layer1_ingest import _EXTRACTORS
                specific_extractor_cls = _EXTRACTORS.get(detected_type)
                if specific_extractor_cls:
                    # Temporarily override document_type so specific extractor uses right prompt
                    document = document.model_copy(update={"document_type": detected_type})
                    result = await specific_extractor_cls().extract(document, llm)
                    logger.info(
                        "other_extractor.delegated",
                        doc_id=str(document.id),
                        to=detected_type,
                    )
                    return result
            except Exception as e:
                logger.warning(
                    "other_extractor.delegation_failed",
                    doc_id=str(document.id),
                    detected_type=detected_type,
                    error=str(e),
                )
                # Fall through to use stage 1 general result below

        # ── Fallback: Use general prompt result as-is ────────────────────────
        # detected_type is unknown/unsupported — use whatever general prompt returned
        source_type = detected_type if detected_type else "other"

        raw_date = data.get("test_date") or data.get("prescription_date") or data.get("follow_up_date")
        try:
            event_time = date.fromisoformat(raw_date) if raw_date else date.today()
        except ValueError:
            event_time = date.today()

        return IngestedItem(
            source_type=source_type,
            source_document_id=document.id,
            patient_id=document.patient_id,
            event_time=event_time,
            ingestion_time=datetime.now(timezone.utc),
            extracted_data=data,
            confidence_per_field=field_confidence,
            raw_text=data.get("raw_text") or document.extracted_text,
        )
