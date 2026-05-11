from datetime import datetime, date
from app.pipeline.layer1_ingest.base import BaseExtractor
from app.pipeline.layer1_ingest.types import IngestedItem
from app.pipeline.layer1_ingest.prescription import PrescriptionExtractor
from app.pipeline.layer1_ingest.lab_report import LabReportExtractor
from app.pipeline.layer1_ingest.doctor_note import DoctorNoteExtractor
from app.models.source_document import SourceDocument
from app.providers.llm.base import LLMProvider
from app.providers.vision.gemini_vision import GeminiVisionClient
from app.lib.signed_url import create_signed_view_url
from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

class OtherExtractor(BaseExtractor):
    """
    Fallback extractor that first detects the document type and then delegates.
    """

    async def extract(
        self,
        document: SourceDocument,
        llm: LLMProvider | None = None,
    ) -> IngestedItem:
        # 1. Use Gemini to detect and extract in one pass
        vision = GeminiVisionClient()
        bucket = settings.supabase_storage_bucket_documents
        signed_url = create_signed_view_url(bucket, document.file_url)
        
        try:
            data, field_confidence = await vision.extract_from_url(
                signed_url,
                document.file_mime_type,
                "other",
            )
            
            # Use the AI's guess for the document type
            detected_type = data.get("document_type_guess", "doctor_note")
            logger.info("other_extractor.auto_detected", doc_id=str(document.id), type=detected_type)
            
            raw_date = data.get("test_date") or data.get("prescription_date") or data.get("follow_up_date")
            try:
                event_time = date.fromisoformat(raw_date) if raw_date else date.today()
            except ValueError:
                event_time = date.today()

            return IngestedItem(
                source_type=detected_type,
                source_document_id=document.id,
                patient_id=document.patient_id,
                event_time=event_time,
                ingestion_time=datetime.utcnow(),
                extracted_data=data,
                confidence_per_field=field_confidence,
                raw_text=data.get("raw_text") or document.extracted_text,
            )
        except Exception as e:
            logger.error("other_extractor.failed", doc_id=str(document.id), error=str(e))
            raise
