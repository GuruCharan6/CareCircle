import asyncio
from typing import Any

from twilio.rest import Client

from app.config import settings
from app.core.logging import get_logger
from app.providers.whatsapp.base import InboundMessage, WhatsAppProvider

logger = get_logger(__name__)


class TwilioProvider(WhatsAppProvider):
    def __init__(self) -> None:
        self._client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        self._from = settings.twilio_whatsapp_from  # 'whatsapp:+14155238886'

    def _to_wa(self, phone: str) -> str:
        return f"whatsapp:{phone}" if not phone.startswith("whatsapp:") else phone

    async def send_text(self, to: str, body: str) -> str:
        msg: Any = await asyncio.to_thread(
            self._client.messages.create,
            from_=self._from,
            to=self._to_wa(to),
            body=body,
        )
        logger.info("whatsapp.sent", sid=msg.sid, to=to)
        return msg.sid

    async def send_interactive(self, to: str, message: dict[str, Any]) -> str:
        # Twilio does not support WhatsApp interactive JSON directly in demo sandbox.
        # Fall back to plain text with URL appended.
        body = message.get("body", {}).get("text", "")
        action = message.get("action", {}).get("parameters", {})
        url = action.get("url", "")
        label = action.get("display_text", "Upload File")
        full_body = f"{body}\n\n{label}: {url}" if url else body
        return await self.send_text(to, full_body)

    async def send_digest_with_cta(
        self,
        to: str,
        digest_body: str,
        cta_url: str,
        cta_label: str = "Upload File",
    ) -> str:
        body = f"{digest_body}\n\n{cta_label}: {cta_url}"
        return await self.send_text(to, body)

    def parse_inbound(self, payload: dict[str, Any]) -> InboundMessage:
        sender = payload.get("From", "")
        if sender.startswith("whatsapp:"):
            sender = sender[len("whatsapp:"):]

        msg_type = "text"
        media_url: str | None = None
        content_text: str | None = payload.get("Body")

        num_media = int(payload.get("NumMedia", 0))
        if num_media > 0:
            media_content_type = payload.get("MediaContentType0", "")
            media_url = payload.get("MediaUrl0")
            if "audio" in media_content_type:
                msg_type = "audio"
            elif "image" in media_content_type:
                msg_type = "image"
            elif "application/pdf" in media_content_type:
                msg_type = "document"
            else:
                msg_type = "document"

        return InboundMessage(
            sender_phone=sender,
            message_type=msg_type,
            content_text=content_text,
            media_url=media_url,
            provider_message_id=payload.get("MessageSid"),
        )
