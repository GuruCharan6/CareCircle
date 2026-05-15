from datetime import date, datetime, timezone

from app.config import settings
from app.lib.signed_url import create_signed_view_url
from app.models.source_document import SourceDocument
from app.pipeline.layer1_ingest.base import BaseExtractor
from app.pipeline.layer1_ingest.types import IngestedItem
from app.providers.llm.base import LLMProvider
from app.providers.vision.gemini_vision import GeminiVisionClient


class LabReportExtractor(BaseExtractor):
    """
    Parses GeminiVision lab report extraction into IngestedItem.

    Expected extracted_data shape:
    {
      "lab_name": str|None,
      "test_date": "YYYY-MM-DD"|None,
      "results": [
        {
          "test_name": str,
          "test_name_display": str,
          "value": float,
          "unit": str,
          "reference_range_low": float|None,
          "reference_range_high": float|None,
          "is_abnormal": bool|None,
          "specialist_type": str|None
        }
      ]
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
                "lab_report",
            )

        results = data.get("results") or []

        raw_date = data.get("test_date")
        try:
            event_time = date.fromisoformat(raw_date) if raw_date else date.today()
        except ValueError:
            event_time = date.today()

        # Coerce numeric fields to float (Gemini may return int or str).
        normalized_results = []
        for r in results:
            normalized_results.append({
                "test_name": r.get("test_name", "unknown"),
                "test_name_display": r.get("test_name_display", r.get("test_name", "Unknown")),
                "value": float(r["value"]) if r.get("value") is not None else None,
                "unit": r.get("unit", ""),
                "reference_range_low": float(r["reference_range_low"]) if r.get("reference_range_low") is not None else None,
                "reference_range_high": float(r["reference_range_high"]) if r.get("reference_range_high") is not None else None,
                "is_abnormal": r.get("is_abnormal"),
                "specialist_type": r.get("specialist_type"),
            })

        return IngestedItem(
            source_type="lab_report",
            source_document_id=document.id,
            patient_id=document.patient_id,
            event_time=event_time,
            ingestion_time=datetime.now(timezone.utc),
            extracted_data={
                "lab_name": data.get("lab_name"),
                "test_date": raw_date,
                "results": normalized_results,
            },
            confidence_per_field=field_confidence,
            raw_text=data.get("raw_text") or document.extracted_text,
        )
