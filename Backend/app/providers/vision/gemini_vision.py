import json
from typing import Any, Dict

from google import genai
from google.genai import types
from google.api_core import exceptions
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Gemini Vision — extracts structured fields from:
#   prescription photos, lab report PDFs, doctor notes, handwritten notes.
# Every extracted field carries confidence score.
# Fields with confidence < 0.7 → extraction_status = 'review_required'.
CONFIDENCE_REVIEW_THRESHOLD = 0.7

_PRESCRIPTION_PROMPT = """
Extract all information from this prescription image.
Return a JSON object with this exact structure:
{
  "medications": [
    {
      "brand_name": "<brand name as written or null>",
      "generic_name": "<generic drug name or null>",
      "dose": "<e.g. 500mg>",
      "frequency": "<e.g. twice daily>",
      "timing": "<e.g. after meals or null>",
      "duration": "<e.g. 30 days or null>"
    }
  ],
  "recent_lab_values": [
    {
      "test_name": "<canonical key e.g. hba1c>",
      "test_name_display": "<human label e.g. HbA1c>",
      "value": <numeric — REQUIRED, do not include if no numeric value>,
      "unit": "<e.g. % or mg/dL>",
      "reference_range_low": <numeric or null>,
      "reference_range_high": <numeric or null>,
      "is_abnormal": <true|false|null>,
      "test_date": "<YYYY-MM-DD — date these investigations were done, or null>"
    }
  ],
  "ordered_tests": [
    {
      "test_name": "<canonical key e.g. hba1c>",
      "test_name_display": "<human label e.g. HbA1c>",
      "due_date": "<YYYY-MM-DD — date by which test must be done, if stated, or null>"
    }
  ],
  "prescriber_name": "<doctor name or null>",
  "prescriber_specialty": "<specialty or null>",
  "prescriber_hospital": "<hospital or null>",
  "prescription_date": "<YYYY-MM-DD or null>",
  "follow_up_date": "<YYYY-MM-DD or null>",
  "follow_up_weeks": <integer or null>,
  "follow_up_instructions": "<plain text follow-up instructions or null>",
  "notes": "<any other important instructions>",
  "raw_text": "<full verbatim readable text transcribed from this document>",
  "field_confidence": {
    "<field_name>": <0.0-1.0>
  }
}

Rules:
- "recent_lab_values": Lab test results already measured and shown in the document (e.g. "Recent Investigations: FBS 186 mg/dL"). Must have a numeric value. Do NOT include vitals (BP, HR, SpO2, weight, temperature).
- "ordered_tests": Tests the doctor is ordering the patient to get done in the FUTURE (e.g. "Get HbA1c done", "Bring HbA1c report to next visit"). No value — just test name and optional due_date.
- If prescription says "get X done and bring result to next visit on [date]": put X in ordered_tests with due_date=[date] AND set follow_up_date=[date].
- If a field is unclear or unreadable: set to null and record confidence < 0.7 in field_confidence.
Return ONLY valid JSON. No prose.
"""

_LAB_REPORT_PROMPT = """
Extract all test results from this lab report.
Return a JSON object with this exact structure:
{
  "lab_name": "<lab name or null>",
  "test_date": "<YYYY-MM-DD or null>",
  "results": [
    {
      "test_name": "<normalized name e.g. fasting_glucose>",
      "test_name_display": "<human readable e.g. Fasting Glucose>",
      "value": <numeric>,
      "unit": "<e.g. mg/dL>",
      "reference_range_low": <numeric or null>,
      "reference_range_high": <numeric or null>,
      "is_abnormal": <true/false/null>,
      "specialist_type": "<endocrinology|cardiology|general or null>"
    }
  ],
  "summary": "<a 1-2 sentence human-readable summary of the key findings in this lab report>",
  "raw_text": "<full verbatim readable text transcribed from this document>",
  "field_confidence": {
    "<field_name>": <0.0-1.0>
  }
}
Return ONLY valid JSON. No prose.
"""

_DOCTOR_NOTE_PROMPT = """
Extract structured information from this doctor note or handwritten note.
Return a JSON object with this exact structure:
{
  "medication_changes": [
    {
      "action": "<add|modify|discontinue>",
      "brand_name": "<as written or null>",
      "dose": "<or null>",
      "frequency": "<or null>",
      "timing": "<or null>"
    }
  ],
  "ordered_tests": [
    {
      "test_name": "<canonical key e.g. hba1c>",
      "test_name_display": "<human label e.g. HbA1c>",
      "due_date": "<YYYY-MM-DD — date by which test must be done, if stated, or null>"
    }
  ],
  "follow_up_instructions": "<plain text or null>",
  "follow_up_date": "<YYYY-MM-DD or null>",
  "follow_up_weeks": <integer or null>,
  "prescriber_specialty": "<cardiologist|endocrinologist|general_physician or null>",
  "doctor_name": "<or null>",
  "prescriber_hospital": "<or null>",
  "summary": "<a 1-2 sentence human-readable summary of the doctor's findings and plan>",
  "notes": "<any other important instructions>",
  "raw_text": "<full verbatim readable text transcribed from this document>",
  "field_confidence": {
    "<field_name>": <0.0-1.0>
  }
}
IMPORTANT for "ordered_tests": Only include tests the doctor is ORDERING for the patient to get done in the FUTURE.
Do NOT include vitals recorded at this visit (BP, HR, SpO2, weight, temperature, EF) or past results mentioned in the note.
Return ONLY valid JSON. No prose.
"""

_DOCUMENT_TYPE_TO_PROMPT: dict[str, str] = {
    "prescription": _PRESCRIPTION_PROMPT,
    "lab_report": _LAB_REPORT_PROMPT,
    "doctor_note": _DOCTOR_NOTE_PROMPT,
    "handwritten_note": _DOCTOR_NOTE_PROMPT,
}


class GeminiVisionClient:
    def __init__(self) -> None:
        self._client = genai.Client(api_key=settings.gemini_api_key)

    @retry(
        retry=retry_if_exception_type(exceptions.ResourceExhausted),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        reraise=True,
    )
    async def extract(
        self,
        image_bytes: bytes,
        mime_type: str,
        document_type: str,
    ) -> tuple[dict[str, Any], dict[str, float]]:
        """Extract structured data from document image/PDF.

        Returns:
            extracted_data: structured fields dict
            field_confidence: {field_name: confidence_score}

        Raises ValueError for unsupported document_type.
        Low-confidence fields (< CONFIDENCE_REVIEW_THRESHOLD) are present in
        field_confidence — caller sets extraction_status = 'review_required'.
        """
        prompt = _DOCUMENT_TYPE_TO_PROMPT.get(document_type)
        if not prompt:
            raise ValueError(
                f"No extraction prompt for document_type: {document_type!r}. "
                f"Supported: {list(_DOCUMENT_TYPE_TO_PROMPT)}"
            )

        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

        try:
            response = await self._client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=prompt),
                        image_part,
                    ],
                ),
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    response_mime_type="application/json",
                ),
            )
            text = response.text
        except Exception as exc:
            logger.error("gemini_vision.error", document_type=document_type, error=str(exc))
            raise

        logger.debug("gemini_vision.raw_response", text=text[:500] if text else "")

        if not text:
            logger.warning("gemini_vision.empty_response")
            return {}, {}

        try:
            clean_text = text
            if "```json" in text:
                clean_text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                clean_text = text.split("```")[1].split("```")[0].strip()

            data: Dict[str, Any] = json.loads(clean_text)
        except json.JSONDecodeError as exc:
            logger.error("gemini_vision.json_parse_error", raw=text[:300])
            raise ValueError(f"Gemini returned invalid JSON: {exc}") from exc

        field_confidence: dict[str, float] = data.pop("field_confidence", {})

        low_confidence_fields = [
            f for f, score in field_confidence.items()
            if score < CONFIDENCE_REVIEW_THRESHOLD
        ]
        if low_confidence_fields:
            logger.warning(
                "gemini_vision.low_confidence",
                document_type=document_type,
                fields=low_confidence_fields,
            )

        logger.info(
            "gemini_vision.extracted",
            document_type=document_type,
            fields=list(data.keys()),
        )
        return data, field_confidence

    async def extract_from_url(
        self,
        file_url: str,
        mime_type: str,
        document_type: str,
    ) -> tuple[dict[str, Any], dict[str, float]]:
        """Download file from URL then extract. For Supabase Storage signed URLs."""
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(file_url)
            resp.raise_for_status()
        return await self.extract(resp.content, mime_type, document_type)
