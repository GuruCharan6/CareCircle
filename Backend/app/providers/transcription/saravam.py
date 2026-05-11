import httpx

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Saravam AI — built for Indian languages, handles Hindi-English code-switching.
# Handles: dawai, ghabraaya, dard, BP, sugar, bukhar, kamzori, dawa khatam, uncle theek hain
# Used for: caregiver WhatsApp voice notes, Meera post-call voice logs, doctor voice instructions.


class SaravamTranscriptionError(Exception):
    pass


class SaravamClient:
    def __init__(self) -> None:
        self._api_key = settings.sarvam_api_key
        self._url = settings.sarvam_api_url

    async def transcribe(self, audio_url: str, language_hint: str = "hi-IN", translate_to_english: bool = True) -> str:
        """Transcribe audio from URL by downloading it first.
        If translate_to_english=True (default), uses speech-to-text-translate endpoint
        to return English output regardless of spoken language.
        Raises SaravamTranscriptionError on failure.
        """
        # 1. Download the audio file
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                auth = None
                if "twilio.com" in audio_url:
                    auth = httpx.BasicAuth(settings.twilio_account_sid, settings.twilio_auth_token)

                resp = await client.get(audio_url, auth=auth, follow_redirects=True)
                resp.raise_for_status()
                audio_bytes = resp.content
                content_type = resp.headers.get("Content-Type", "audio/ogg")
            except Exception as exc:
                logger.error("saravam.download_failed", url=audio_url, error=str(exc))
                raise SaravamTranscriptionError(f"Failed to download audio from Twilio: {exc}")

        # 2. Upload to Sarvam
        # speech-to-text-translate: outputs English, uses language_code, no model param
        # speech-to-text: outputs source language, uses language + model params
        if translate_to_english:
            endpoint = "https://api.sarvam.ai/speech-to-text-translate"
            headers = {"api-subscription-key": self._api_key}
            files = {"file": ("audio", audio_bytes, content_type)}
            data = {"language_code": language_hint}
        else:
            endpoint = self._url
            headers = {"api-subscription-key": self._api_key}
            files = {"file": ("audio", audio_bytes, content_type)}
            data = {"language": language_hint, "model": "saaras:v3"}

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    endpoint,
                    headers=headers,
                    files=files,
                    data=data,
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                logger.error("sarvam.http_error", status=exc.response.status_code, body=exc.response.text[:200])
                raise SaravamTranscriptionError(f"Sarvam API error {exc.response.status_code}")
            except Exception as exc:
                logger.error("sarvam.request_error", error=str(exc))
                raise SaravamTranscriptionError(f"Sarvam request failed: {exc}")

        data = response.json()
        transcript = data.get("transcript") or data.get("text")
        if not transcript:
            raise SaravamTranscriptionError("Sarvam returned no transcript")

        return transcript

    async def transcribe_bytes(
        self,
        audio_bytes: bytes,
        mime_type: str,
        language_hint: str = "hi-IN",
        translate_to_english: bool = True,
    ) -> str:
        """Transcribe raw audio bytes.
        translate_to_english=True (default): outputs English via speech-to-text-translate.
        """
        if translate_to_english:
            endpoint = "https://api.sarvam.ai/speech-to-text-translate"
            data = {"language_code": language_hint}
        else:
            endpoint = self._url
            data = {"language": language_hint, "model": "saaras:v3"}

        headers = {"api-subscription-key": self._api_key}
        files = {"file": ("audio", audio_bytes, mime_type)}

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    endpoint, headers=headers, files=files, data=data
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise SaravamTranscriptionError(
                    f"Sarvam API error {exc.response.status_code}: {exc.response.text[:200]}"
                ) from exc

        result = response.json()
        transcript = result.get("transcript") or result.get("text")
        if not transcript:
            raise SaravamTranscriptionError("Sarvam returned no transcript")

        return transcript
