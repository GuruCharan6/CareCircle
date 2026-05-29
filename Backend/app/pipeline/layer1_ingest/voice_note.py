from datetime import UTC, date, datetime
from typing import Any

from app.core.logging import get_logger
from app.models.source_document import SourceDocument
from app.pipeline.layer1_ingest.base import BaseExtractor
from app.pipeline.layer1_ingest.types import IngestedItem
from app.providers.llm.base import LLMProvider

logger = get_logger(__name__)

_EXPECTED_FIELDS = {
    "symptoms_reported",
    "symptoms_denied",
    "symptoms_absent",
    "meals_eaten",
    "medications_taken",
    "mood",
}

_NLP_SYSTEM_PROMPT = """
You are a medical information extractor. Extract structured health data from voice note transcripts.
The transcript may contain Hindi-English code-switching (Hinglish).
Common Hinglish terms: dawai=medicine, ghabraaya=anxious/dizzy, dard=pain, bukhar=fever,
kamzori=weakness, BP=blood pressure, sugar=blood sugar, dawa khatam=medicine finished,
theek hain=doing fine, mana kar diya=refused, nahi khaya=didn't eat, ulti=vomiting.
Return ONLY valid JSON. No prose, no explanation.
"""

_NLP_PROMPT_TEMPLATE = """
Extract structured health information from this voice note transcript.
Speaker: {speaker_role}

Transcript:
{transcript}

Return JSON with this exact structure:
{{
  "symptoms_reported": ["<symptom>"],
  "symptoms_denied": ["<symptom>"],
  "symptoms_absent": ["<symptom that was notable by absence>"],
  "meals_eaten": {{"breakfast": true/false/null, "lunch": true/false/null, "dinner": true/false/null}},
  "meal_notes": "<details or null>",
  "medications_taken": true/false/null,
  "medication_timing_notes": "<timing or deviation or null>",
  "mobility_notes": "<mobility observations or null>",
  "mood": "<good|neutral|low|anxious|irritable|confused|null>",
  "energy_level": "<high|normal|low|very_low|null>",
  "meera_mood_read": "<reporter's read of patient mood or null>",
  "concerns_flagged": ["<concern>"]
}}
"""


def _has_structured_fields(data: dict[str, Any]) -> bool:
    return bool(_EXPECTED_FIELDS.intersection(data.keys()))


class VoiceNoteExtractor(BaseExtractor):
    """
    Handles caregiver WhatsApp voice notes and Meera's post-call voice logs.

    Transcription: Sarvam STT (handled upstream in extract_document task).
    NLP extraction: Gemini (gemini-2.5-flash) — handles Hinglish paraphrase.

    Falls back to pre-extracted NLP fields if already present in extracted_data.
    """

    async def extract(
        self,
        document: SourceDocument,
        llm: LLMProvider | None = None,
    ) -> IngestedItem:
        data = document.extracted_data or {}
        transcript = document.extracted_text or ""

        if not transcript:
            raise ValueError(
                f"Voice note document {document.id} has no extracted_text (transcript). "
                "Sarvam transcription must run before extraction."
            )

        if _has_structured_fields(data):
            logger.info("voice_note.using_preextracted", source_document_id=str(document.id))
            nlp_data = data
        else:
            if llm is None:
                raise ValueError(
                    f"Voice note {document.id} needs NLP extraction but no LLM provided"
                )
            logger.info(
                "voice_note.running_nlp",
                source_document_id=str(document.id),
                transcript_length=len(transcript),
            )
            nlp_data = await self._run_nlp(transcript, document.ingestion_source, llm)

        source_type = (
            "voice_note_caregiver"
            if "caregiver" in (document.ingestion_source or "").lower()
            else "voice_note_meera"
        )

        return IngestedItem(
            source_type=source_type,
            source_document_id=document.id,
            patient_id=document.patient_id,
            event_time=document.event_date or date.today(),
            ingestion_time=datetime.now(UTC),
            extracted_data={
                "symptoms_reported": nlp_data.get("symptoms_reported") or [],
                "symptoms_denied": nlp_data.get("symptoms_denied") or [],
                "symptoms_absent": nlp_data.get("symptoms_absent") or [],
                "meals_eaten": nlp_data.get("meals_eaten"),
                "meal_notes": nlp_data.get("meal_notes"),
                "medications_taken": nlp_data.get("medications_taken"),
                "medication_timing_notes": nlp_data.get("medication_timing_notes"),
                "mobility_notes": nlp_data.get("mobility_notes"),
                "mood": nlp_data.get("mood"),
                "energy_level": nlp_data.get("energy_level"),
                "meera_mood_read": nlp_data.get("meera_mood_read"),
                "concerns_flagged": nlp_data.get("concerns_flagged") or [],
            },
            confidence_per_field=document.field_confidence or {},
            raw_text=transcript,
        )

    async def _run_nlp(
        self,
        transcript: str,
        ingestion_source: str | None,
        llm: LLMProvider,
    ) -> dict[str, Any]:
        speaker_role = (
            "caregiver reporting on the patient"
            if ingestion_source and "caregiver" in ingestion_source.lower()
            else "family member (Meera) reporting what the patient said on a call"
        )
        prompt = _NLP_PROMPT_TEMPLATE.format(
            speaker_role=speaker_role,
            transcript=transcript,
        )
        return await llm.complete_json(prompt, system_prompt=_NLP_SYSTEM_PROMPT, thinking_budget=512)
