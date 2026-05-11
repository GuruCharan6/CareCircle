from datetime import datetime
from uuid import UUID

from app.models.base import ORMBase


class WhatsAppMessage(ORMBase):
    id: UUID
    direction: str
    sender_phone: str
    recipient_phone: str
    patient_id: UUID | None = None
    sender_type: str | None = None
    message_type: str
    content_text: str | None = None
    media_url: str | None = None
    linked_source_document_id: UUID | None = None
    linked_observation_id: UUID | None = None
    linked_notification_id: UUID | None = None
    twilio_message_sid: str | None = None
    status: str = "received"
    error_message: str | None = None
    created_at: datetime | None = None
