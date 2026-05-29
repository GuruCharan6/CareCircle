from datetime import UTC, date, datetime

from app.config import settings
from app.core.logging import get_logger
from app.lib.signed_url import create_signed_view_url
from app.models.source_document import SourceDocument
from app.pipeline.layer1_ingest.base import BaseExtractor
from app.pipeline.layer1_ingest.types import IngestedItem
from app.providers.llm.base import LLMProvider
from app.providers.vision.gemini_vision import GeminiVisionClient

logger = get_logger(__name__)


class OtherExtractor(BaseExtractor):
    """
    Single-pass extractor using the general prompt.
    Gemini extracts ALL fields (medications, lab results, follow-up, doctor info)
    and auto-detects document_type via document_type_guess.
    No Stage 2 delegation — avoids losing medications when type is misclassified.
    """

    async def extract(
        self,
        document: SourceDocument,
        llm: LLMProvider | None = None,
    ) -> IngestedItem:
        vision = GeminiVisionClient()
        bucket = settings.supabase_storage_bucket_documents
        signed_url = create_signed_view_url(bucket, document.file_url)

        try:
            data, field_confidence = await vision.extract_from_url(
                signed_url,
                document.file_mime_type,
                "other",
            )
        except Exception as e:
            logger.error("other_extractor.failed", doc_id=str(document.id), error=str(e))
            raise

        detected_type = (data.get("document_type_guess") or "other").strip().lower()
        logger.info(
            "other_extractor.complete",
            doc_id=str(document.id),
            detected_type=detected_type,
            medications=len(data.get("medications") or []),
            results=len(data.get("results") or []),
        )

        raw_date = (
            data.get("prescription_date")
            or data.get("test_date")
            or data.get("follow_up_date")
        )
        try:
            event_time = date.fromisoformat(raw_date) if raw_date else date.today()
        except ValueError:
            event_time = date.today()

        raw_text = data.pop("raw_text", None) or document.extracted_text
        data.pop("document_type_guess", None)  # stored as document_type column, not needed in JSONB
        data.pop("summary", None)  # large string, not needed for pipeline logic

        return IngestedItem(
            source_type=detected_type,
            source_document_id=document.id,
            patient_id=document.patient_id,
            event_time=event_time,
            ingestion_time=datetime.now(UTC),
            extracted_data=data,
            confidence_per_field=field_confidence,
            raw_text=raw_text,
        )
