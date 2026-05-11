from uuid import UUID

from app.models.whatsapp_message import WhatsAppMessage
from app.repositories.base import BaseRepository


class WhatsAppMessageRepository(BaseRepository):
    async def get_by_id(self, message_id: UUID) -> WhatsAppMessage | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.whatsapp_messages WHERE id = $1", message_id
        )
        return WhatsAppMessage.from_record(row) if row else None

    async def get_by_twilio_sid(self, sid: str) -> WhatsAppMessage | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.whatsapp_messages WHERE twilio_message_sid = $1", sid
        )
        return WhatsAppMessage.from_record(row) if row else None

    async def get_by_patient_id(
        self, patient_id: UUID, limit: int = 50
    ) -> list[WhatsAppMessage]:
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.whatsapp_messages
            WHERE patient_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            """,
            patient_id, limit,
        )
        return [WhatsAppMessage.from_record(r) for r in rows]

    async def create(
        self,
        *,
        direction: str,
        sender_phone: str,
        recipient_phone: str,
        message_type: str,
        patient_id: UUID | None = None,
        sender_type: str | None = None,
        content_text: str | None = None,
        media_url: str | None = None,
        twilio_message_sid: str | None = None,
        linked_source_document_id: UUID | None = None,
    ) -> WhatsAppMessage:
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.whatsapp_messages
              (direction, sender_phone, recipient_phone, message_type,
               patient_id, sender_type, content_text, media_url,
               twilio_message_sid, linked_source_document_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING *
            """,
            direction, sender_phone, recipient_phone, message_type,
            patient_id, sender_type, content_text, media_url,
            twilio_message_sid, linked_source_document_id,
        )
        return WhatsAppMessage.from_record(row)

    async def update_status(
        self, message_id: UUID, status: str, error_message: str | None = None
    ) -> None:
        await self.conn.execute(
            """
            UPDATE public.whatsapp_messages
            SET status = $2, error_message = $3
            WHERE id = $1
            """,
            message_id, status, error_message,
        )

    async def link_observation(self, message_id: UUID, observation_id: UUID) -> None:
        await self.conn.execute(
            "UPDATE public.whatsapp_messages SET linked_observation_id = $2 WHERE id = $1",
            message_id, observation_id,
        )

    async def link_source_document(self, message_id: UUID, document_id: UUID) -> None:
        await self.conn.execute(
            "UPDATE public.whatsapp_messages SET linked_source_document_id = $2 WHERE id = $1",
            message_id, document_id,
        )
