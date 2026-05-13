import asyncio
from datetime import date
from uuid import UUID

import httpx
from celery import shared_task

from app.config import settings
from app.core.logging import get_logger
from app.core.supabase import supabase_admin
from app.providers.llm import get_llm_provider
from app.providers.transcription.saravam import SaravamClient
from app.repositories.caregiver_repository import CaregiverRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.observation_repository import ObservationRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.whatsapp_message_repository import WhatsAppMessageRepository
from app.worker._db import worker_conn

logger = get_logger(__name__)


async def _download_twilio_audio(url: str) -> tuple[bytes, str]:
    """Download audio from Twilio URL with auth. Returns (bytes, content_type)."""
    auth = httpx.BasicAuth(settings.twilio_account_sid, settings.twilio_auth_token)
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, auth=auth, follow_redirects=True)
        resp.raise_for_status()
    content_type = resp.headers.get("Content-Type", "audio/ogg")
    return resp.content, content_type


def _upload_to_supabase(audio_bytes: bytes, storage_path: str, content_type: str) -> None:
    """Upload audio bytes to Supabase Storage (sync — supabase-py is sync)."""
    bucket = settings.supabase_storage_bucket_documents
    supabase_admin.storage.from_(bucket).upload(
        storage_path,
        audio_bytes,
        file_options={"content-type": content_type, "upsert": "true"},
    )


async def _async_run(message_id_str: str) -> None:
    message_id = UUID(message_id_str)
    logger.info("process_whatsapp_media.started", message_id=message_id_str)
    async with worker_conn(max_size=3, command_timeout=60) as conn:
        msg_repo = WhatsAppMessageRepository(conn)
        obs_repo = ObservationRepository(conn)
        cg_repo = CaregiverRepository(conn)
        doc_repo = DocumentRepository(conn)

        msg = await msg_repo.get_by_id(message_id)
        if not msg or not msg.media_url or not msg.patient_id:
            logger.warning("whatsapp_task.invalid_message", message_id=message_id_str)
            return

        cg = await cg_repo.get_by_phone(msg.sender_phone)
        patient = await PatientRepository(conn).get_by_id(msg.patient_id)
        patient_user_id = patient.user_id if patient else None

        # 1. Download audio from Twilio
        try:
            audio_bytes, content_type = await _download_twilio_audio(msg.media_url)
        except Exception as exc:
            logger.error("whatsapp_task.download_failed", error=str(exc))
            return

        # 2. Upload to Supabase Storage so frontend can play it
        ext = "ogg" if "ogg" in content_type else "mp4"
        storage_path = f"{msg.patient_id}/{message_id}.{ext}"
        try:
            await asyncio.get_running_loop().run_in_executor(
                None, _upload_to_supabase, audio_bytes, storage_path, content_type
            )
            logger.info("whatsapp_task.audio_uploaded", path=storage_path)
        except Exception as exc:
            logger.error("whatsapp_task.upload_failed", error=str(exc))
            # Non-fatal — continue without audio playback

        # 3. Create SourceDocument with Supabase path (not Twilio URL)
        source_doc = await doc_repo.create(
            patient_id=msg.patient_id,
            document_type="voice_note",
            ingestion_source="whatsapp_caregiver",
            file_url=storage_path,
            file_mime_type=content_type,
            uploaded_by=patient_user_id,
            caregiver_id=cg.id if cg else None,
        )
        await msg_repo.link_source_document(message_id, source_doc.id)

        # 4. Transcribe to English
        if msg.message_type != "audio":
            return

        try:
            sarvam = SaravamClient()
            transcript = await sarvam.transcribe_bytes(
                audio_bytes, content_type, translate_to_english=True
            )
            await doc_repo.update_extraction(
                source_doc.id,
                extraction_status="approved",
                extracted_text=transcript,
            )
        except Exception as exc:
            logger.error("whatsapp_task.transcription_failed", error=str(exc))
            await msg_repo.update_status(message_id, "failed", f"Transcription failed: {str(exc)}")
            await doc_repo.update_extraction(source_doc.id, extraction_status="failed")
            return

        if not transcript:
            return

        # 5. AI extraction
        llm = get_llm_provider()
        prompt = f"""
        Extract detailed clinical observations from this caregiver voice note transcript:
        "{transcript}"

        Return ONLY a JSON object with these fields:
        - symptoms_reported: list[str]
        - symptoms_denied: list[str]
        - symptoms_absent: list[str] (symptoms notably NOT present)
        - meals_eaten: {{ "breakfast": bool|null, "lunch": bool|null, "dinner": bool|null }}
        - meal_notes: str (what they ate, appetite)
        - medications_taken: bool (true if taken, false if missed)
        - medication_timing_notes: str (e.g. 'on time', 'delayed by 1h')
        - mobility_notes: str (how they are moving/walking)
        - mood: str (one of: 'normal', 'good', 'low', 'anxious', 'irritable', 'confused')
        - energy_level: str (one of: 'normal', 'low', 'very_low')
        - concerns_flagged: list[str] (any medical concerns identified)
        - summary: str (1-sentence overview)
        """

        try:
            extraction = await llm.complete_json(prompt)
            ext = extraction[0] if isinstance(extraction, list) else (extraction or {})

            obs_data = {
                "patient_id": msg.patient_id,
                "source_type": "caregiver_voice",
                "caregiver_id": cg.id if cg else None,
                "source_document_id": source_doc.id,
                "observation_date": msg.created_at.date() if msg.created_at else date.today(),
                "raw_transcript": transcript,
                "mood": str(ext.get("mood", "normal")),
                "energy_level": str(ext.get("energy_level", "normal")),
                "symptoms_reported": ext.get("symptoms_reported") or [],
                "symptoms_denied": ext.get("symptoms_denied") or [],
                "symptoms_absent": ext.get("symptoms_absent") or [],
                "meals_eaten": ext.get("meals_eaten"),
                "meal_notes": ext.get("meal_notes"),
                "medications_taken": ext.get("medications_taken") if isinstance(ext.get("medications_taken"), bool) else None,
                "medication_timing_notes": ext.get("medication_timing_notes"),
                "mobility_notes": ext.get("mobility_notes"),
                "concerns_flagged": ext.get("concerns_flagged") or ([ext.get("summary")] if ext.get("summary") else []),
            }

            obs = await obs_repo.create(**obs_data)
            await msg_repo.update_status(message_id, "processed")
            await msg_repo.link_observation(message_id, obs.id)
            logger.info("process_whatsapp_media.success", message_id=message_id, observation_id=obs.id)

        except Exception as exc:
            logger.error("process_whatsapp_media.extraction_failed", message_id=message_id, error=str(exc))
            await msg_repo.update_status(message_id, "failed", f"AI Extraction failed: {str(exc)}")


@shared_task(
    bind=True,
    name="process_whatsapp_media",
    max_retries=3,
    default_retry_delay=30,
)
def process_whatsapp_media_task(self, message_id_str: str) -> None:
    try:
        asyncio.run(_async_run(message_id_str))
    except Exception as exc:
        logger.error("process_whatsapp_media_task.failed", message_id=message_id_str, error=str(exc))
        raise self.retry(exc=exc)
