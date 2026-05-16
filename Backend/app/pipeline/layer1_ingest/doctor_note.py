from datetime import date, datetime, timedelta, timezone

from app.config import settings
from app.lib.signed_url import create_signed_view_url
from app.models.source_document import SourceDocument
from app.pipeline.layer1_ingest.base import BaseExtractor
from app.pipeline.layer1_ingest.types import IngestedItem
from app.providers.llm.base import LLMProvider
from app.providers.vision.gemini_vision import GeminiVisionClient


class DoctorNoteExtractor(BaseExtractor):
    """
    Parses GeminiVision doctor note extraction into IngestedItem.

    Expected extracted_data shape:
    {
      "medication_changes": [
        {"action": "add"|"modify"|"discontinue", "brand_name": str|None,
         "dose": str|None, "frequency": str|None, "timing": str|None}
      ],
      "follow_up_instructions": str|None,
      "follow_up_date": "YYYY-MM-DD"|None,
      "follow_up_weeks": int|None,
      "specialist_type": str|None,
      "doctor_name": str|None,
      "notes": str|None
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
                document.document_type if document.document_type in ("doctor_note", "handwritten_note") else "doctor_note",
            )

        # Resolve follow_up_date: explicit date takes priority, else compute from weeks.
        from app.lib.dates import parse_date_robust
        
        event_time = document.event_date or date.today()
        
        raw_follow_up = data.get("follow_up_date")
        follow_up_date_obj = parse_date_robust(raw_follow_up)
        
        if not follow_up_date_obj and data.get("follow_up_weeks"):
            try:
                follow_up_date_obj = event_time + timedelta(weeks=float(data["follow_up_weeks"]))
            except (ValueError, TypeError):
                pass
        
        follow_up_date_str = follow_up_date_obj.isoformat() if follow_up_date_obj else None

        return IngestedItem(
            source_type="doctor_note",
            source_document_id=document.id,
            patient_id=document.patient_id,
            event_time=event_time,
            ingestion_time=datetime.now(timezone.utc),
            extracted_data={
                "medication_changes": data.get("medication_changes") or [],
                "ordered_tests": data.get("ordered_tests") or [],
                "follow_up_instructions": data.get("follow_up_instructions"),
                "follow_up_date": follow_up_date_str,
                "follow_up_weeks": data.get("follow_up_weeks"),
                "specialist_type": data.get("specialist_type"),
                "doctor_name": data.get("doctor_name"),
                "notes": data.get("notes"),
            },
            confidence_per_field=field_confidence,
            raw_text=data.get("raw_text") or document.extracted_text,
        )
