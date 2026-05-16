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
Extract all medication, follow-up information, and any lab tests or investigations ordered from this prescription image.
Return a JSON object with this exact structure:
{
  "medications": [
    {
      "brand_name": "<as written>",
      "dose": "<e.g. 500mg>",
      "frequency": "<e.g. twice daily>",
      "timing": "<e.g. after meals>",
      "duration": "<e.g. 30 days or null>"
    }
  ],
  "prescriber_name": "<doctor name or null>",
  "prescriber_specialty": "<specialty or null>",
  "prescriber_hospital": "<hospital or null>",
  "prescription_date": "<YYYY-MM-DD or null>",
  "follow_up_date": "<YYYY-MM-DD or null>",
  "follow_up_weeks": <integer or null>,
  "summary": "<a 1-2 sentence human-readable summary of the prescription>",
  "results": [
    {
      "test_name": "<canonical test name e.g. hba1c>",
      "test_name_display": "<human readable name e.g. HbA1c Test>",
      "due_date": "<YYYY-MM-DD or null — date by which test must be completed, if explicitly stated>"
    }
  ],
  "notes": "<any other important instructions>",
  "raw_text": "<full verbatim readable text transcribed from this document>",
  "field_confidence": {
    "<field_name>": <0.0-1.0>
  }
}
IMPORTANT for "results": Only include tests/investigations that the doctor is ORDERING the patient to get done in the FUTURE (e.g. "Investigations advised: Lipid Profile", "Get CBC done", "HbA1c after 3 months", "Bring HbA1c result to next visit").
Do NOT include: vitals measured at this visit (BP, HR, SpO2, weight, temperature), recent/past lab results shown in the document header or summary, or any values that have already been measured.
If the prescription says "get X done and bring result to next visit on [date]", include X in results with due_date = [date], AND set follow_up_date = [date] for the appointment.
If any field is unclear or unreadable, set it to null and record confidence < 0.7 in field_confidence.
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
  "results": [
    {
      "test_name": "<canonical test name e.g. hba1c>",
      "test_name_display": "<human readable name e.g. HbA1c Test>"
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
IMPORTANT for "results": Only include tests/investigations the doctor is ORDERING for the patient to get done in the FUTURE.
Do NOT include vitals recorded at this visit (BP, HR, SpO2, weight, temperature, EF) or past results mentioned in the note.
Return ONLY valid JSON. No prose.
"""

_GENERAL_PROMPT = """
Analyze this medical document. It may be a prescription, lab report, doctor note, or handwritten note.
Extract ALL information present. Do not skip any section of the document.

Return a JSON object with this exact structure:
{
  "document_type_guess": "<prescription|lab_report|doctor_note|handwritten_note>",
  "medications": [
    {
      "brand_name": "<as written or null>",
      "generic_name": "<generic drug name or null>",
      "dose": "<e.g. 5mg or null>",
      "frequency": "<e.g. once daily or null>",
      "timing": "<e.g. after meals or null>",
      "duration": "<e.g. 30 days or null>"
    }
  ],
  "results": [
    {
      "test_name": "<normalized key e.g. fasting_glucose>",
      "test_name_display": "<human label e.g. Fasting Glucose>",
      "value": <numeric or null>,
      "unit": "<e.g. mg/dL or null>",
      "reference_range_low": <numeric or null>,
      "reference_range_high": <numeric or null>,
      "is_abnormal": <true|false|null>,
      "due_date": "<YYYY-MM-DD or null — date by which test must be completed, if explicitly stated>"
    }
  ],
  "prescriber_name": "<doctor name or null>",
  "doctor_name": "<same as prescriber_name — include both>",
  "prescriber_specialty": "<e.g. cardiologist or null>",
  "prescriber_hospital": "<hospital name or null>",
  "lab_name": "<lab or hospital name or null>",
  "prescription_date": "<YYYY-MM-DD or null>",
  "test_date": "<YYYY-MM-DD or null>",
  "follow_up_date": "<YYYY-MM-DD or null>",
  "follow_up_weeks": <integer or null>,
  "follow_up_instructions": "<plain text follow-up instructions or null>",
  "notes": "<any other instructions, observations, or important text>",
  "summary": "<1-2 sentence overview of this document>",
  "raw_text": "<full verbatim readable text from this document>",
  "field_confidence": {
    "<field_name>": <0.0-1.0>
  }
}

Classification rules for document_type_guess:
- "prescription": Document primarily lists medications with drug names, doses, and frequency/duration — even if handwritten. Rx symbol or a medication table is a strong signal. A doctor's note that also prescribes medicines is STILL a "prescription".
- "lab_report": Document shows laboratory test results with numeric values, units, and reference ranges from a diagnostic lab.
- "doctor_note": Document records clinical observations, diagnosis, examination findings, or treatment plan WITHOUT a formal medication list (no drug names with doses).
- "handwritten_note": Informal handwritten personal notes not fitting the above categories.

Extraction rules:
- For "results" in a prescription or doctor_note: only include tests/investigations the doctor is ORDERING for the patient to do in the FUTURE. Do NOT include vitals recorded at this visit (BP, HR, SpO2, weight, temperature). If the prescription says "bring X result to next visit on [date]", include X in results with due_date = [date] AND set follow_up_date = [date].
- Extract ALL medications listed, even if only mentioned in passing.
- If a field is not present, set it to null.
- Return ONLY valid JSON. No prose, no markdown.
"""

_DOCUMENT_TYPE_TO_PROMPT: dict[str, str] = {
    "prescription": _PRESCRIPTION_PROMPT,
    "lab_report": _LAB_REPORT_PROMPT,
    "doctor_note": _DOCTOR_NOTE_PROMPT,
    "handwritten_note": _DOCTOR_NOTE_PROMPT,
    "other": _GENERAL_PROMPT,
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

        logger.info("gemini_vision.raw_response", text=text)

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
