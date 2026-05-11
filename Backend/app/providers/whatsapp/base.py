from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class InboundMessage:
    sender_phone: str       # E.164 format
    message_type: str       # 'text'|'audio'|'image'|'document'|'video'
    content_text: str | None = None
    media_url: str | None = None
    provider_message_id: str | None = None  # Twilio SID or Meta message ID


class WhatsAppProvider(ABC):
    @abstractmethod
    async def send_text(self, to: str, body: str) -> str:
        """Send plain text message. Returns provider message ID."""

    @abstractmethod
    async def send_interactive(self, to: str, message: dict[str, Any]) -> str:
        """Send interactive message (CTA button, quick reply).
        message must be provider-formatted interactive payload.
        Returns provider message ID."""

    @abstractmethod
    async def send_digest_with_cta(
        self,
        to: str,
        digest_body: str,
        cta_url: str,
        cta_label: str = "Upload File",
    ) -> str:
        """Send morning/evening digest with Upload File CTA button.
        cta_url = carecircle.app/upload?token=<15-min JWT>
        Returns provider message ID."""

    @abstractmethod
    def parse_inbound(self, payload: dict[str, Any]) -> InboundMessage:
        """Parse raw webhook payload into InboundMessage.
        Raises ValueError if payload is malformed."""
