from datetime import date, datetime, timezone

from app.config import settings
from app.lib.signed_url import create_signed_view_url
from app.models.source_document import SourceDocument
from app.pipeline.layer1_ingest.base import BaseExtractor
from app.pipeline.layer1_ingest.types import IngestedItem
from app.providers.llm.base import LLMProvider
from app.providers.vision.gemini_vision import GeminiVisionClient


class PrescriptionExtractor(BaseExtractor):
    """
    Parses GeminiVision prescription extraction into IngestedItem.

    Expected extracted_data shape:
    {
      "medications": [
        {"brand_name": str, "dose": str, "frequency": str, "timing": str|None, "duration": str|None}
      ],
      "prescriber_name": str|None,
      "prescriber_specialty": str|None,
      "prescriber_hospital": str|None,
      "prescription_date": "YYYY-MM-DD"|None
    }
    """

    async def extract(
        self,
        document: SourceDocument,
        llm: LLMProvider | None = None,
    ) -> IngestedItem:
        data = document.extracted_data or {}
        field_confidence = document.field_confidence or {}

        if (not data or "raw_text" not in data) and document.file_url:
            # Perform actual AI extraction from image/PDF
            vision = GeminiVisionClient()
            bucket = settings.supabase_storage_bucket_documents
            signed_url = create_signed_view_url(bucket, document.file_url)

            data, field_confidence = await vision.extract_from_url(
                signed_url,
                document.file_mime_type,
                "prescription",
            )

        medications = data.get("medications") or []

        # Resolve event_time: use prescription_date if available, else today.
        from app.lib.dates import parse_date_robust
        raw_date = data.get("prescription_date")
        event_time = parse_date_robust(raw_date) or document.event_date or date.today()

        return IngestedItem(
            source_type="prescription",
            source_document_id=document.id,
            patient_id=document.patient_id,
            event_time=event_time,
            ingestion_time=datetime.now(timezone.utc),
            extracted_data={
                "medications": medications,
                "prescriber_name": data.get("prescriber_name"),
                "prescriber_specialty": data.get("prescriber_specialty"),
                "prescriber_hospital": data.get("prescriber_hospital"),
                "prescription_date": raw_date,
                "follow_up_date": data.get("follow_up_date"),
                "follow_up_weeks": data.get("follow_up_weeks"),
                "results": data.get("results") or [],
                "notes": data.get("notes"),
            },
            confidence_per_field=field_confidence,
            raw_text=data.get("raw_text") or document.extracted_text,
        )
