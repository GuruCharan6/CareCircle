from __future__ import annotations

from typing import Any

import asyncpg

from app.core.logging import get_logger
from app.providers.whatsapp.factory import get_whatsapp_provider
from app.repositories.caregiver_repository import CaregiverRepository
from app.repositories.whatsapp_message_repository import WhatsAppMessageRepository

logger = get_logger(__name__)

_DEFAULT_REPLY = (
    "Hello! This number is for CareCircle caregiver updates only. "
    "If you're a caregiver, please ask the family to add you to the system."
)


class WhatsAppService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._msg_repo = WhatsAppMessageRepository(conn)
        self._caregiver_repo = CaregiverRepository(conn)
        self._provider = get_whatsapp_provider()

    async def handle_inbound(self, payload: dict[str, Any]) -> None:
        try:
            msg = self._provider.parse_inbound(payload)
            logger.info("whatsapp_service.inbound_received", sender=msg.sender_phone, type=msg.message_type)
        except (ValueError, KeyError) as exc:
            logger.warning("whatsapp_service.parse_failed", error=str(exc))
            return

        caregiver = await self._caregiver_repo.get_by_phone(msg.sender_phone)
        user = None
        if not caregiver:
            from app.repositories.user_repository import UserRepository
            user_repo = UserRepository(self._msg_repo.conn)
            user = await user_repo.get_by_phone(msg.sender_phone)

        if not caregiver and not user:
            logger.warning("whatsapp_service.sender_not_found", phone=msg.sender_phone)

        patient_id = caregiver.patient_id if caregiver else None
        sender_type = "caregiver" if caregiver else ("user" if user else "unknown")

        await self._msg_repo.create(
            direction="inbound",
            sender_phone=msg.sender_phone,
            recipient_phone="system",
            message_type=msg.message_type,
            patient_id=patient_id,
            sender_type=sender_type,
            content_text=msg.content_text,
            media_url=msg.media_url,
            twilio_message_sid=msg.provider_message_id,
        )

        if caregiver:
            await self._handle_caregiver_message(caregiver, msg)
        elif user:
            await self._handle_user_message(user, msg)
        else:
            try:
                logger.info("whatsapp_service.sending_default_reply", to=msg.sender_phone)
                await self._provider.send_text(msg.sender_phone, _DEFAULT_REPLY)
            except Exception as exc:
                logger.error("whatsapp_service.default_reply_failed", error=str(exc))

    async def _handle_user_message(self, user, msg) -> None:
        """Handle messages from the primary family user (Meera)."""
        logger.info("whatsapp_service.user_message", user_id=str(user.id))

        # Mark as connected if not already
        prefs = user.preferences or {}
        if not prefs.get("whatsapp_connected"):
            from app.repositories.user_repository import UserRepository
            user_repo = UserRepository(self._msg_repo.conn)
            prefs["whatsapp_connected"] = True
            prefs["whatsapp_number"] = msg.sender_phone
            # Automatically enable digest if they are joining now
            prefs["whatsapp_digest"] = True
            await user_repo.update_preferences(user.id, prefs)

            welcome = (
                f"Welcome to CareCircle WhatsApp, {user.name}! 🌟\n\n"
                "I've connected your account. You will now receive your daily health digests here."
            )
            await self._provider.send_text(msg.sender_phone, welcome)
        else:
            # If already connected, maybe they are asking the chatbot?
            # For now, just acknowledge.
            await self._provider.send_text(
                msg.sender_phone,
                "I've received your message! If you have questions about your patient's health, please use the CareCircle app."
            )

    async def _handle_caregiver_message(self, caregiver, msg) -> None:
        logger.info(
            "whatsapp_service.caregiver_message",
            caregiver_id=str(caregiver.id),
            message_type=msg.message_type,
            text=msg.content_text
        )

        if msg.message_type == "audio":
            db_msg = await self._msg_repo.get_by_twilio_sid(msg.provider_message_id)
            if db_msg:
                import asyncio

                from app.worker.tasks.process_whatsapp_media import _async_run as _process_media
                asyncio.ensure_future(_process_media(str(db_msg.id)))
                logger.info("whatsapp_service.media_task_triggered", message_id=str(db_msg.id))

        if msg.message_type != "text" or not msg.content_text:
            # Non-text (audio/image) — acknowledge
            try:
                await self._provider.send_text(
                    msg.sender_phone,
                    "Voice note received! I'm transcribing it and updating the care team now.",
                )
            except Exception as exc:
                logger.error("whatsapp_service.ack_failed", error=str(exc))
            return

        text = msg.content_text.strip().upper().replace("!", "")
        logger.info("whatsapp_service.processing_text", original=msg.content_text, normalized=text)

        if text == "YES":
            await self._caregiver_repo.update_invitation_status(caregiver.id, "confirmed")
            reply = (
                f"Thank you {caregiver.name}! You are now confirmed as a caregiver. "
                "You can send voice notes and updates about the patient here."
            )
        elif text == "NO":
            await self._caregiver_repo.update_invitation_status(caregiver.id, "declined")
            reply = "Understood. No further messages will be sent."
        else:
            reply = "Message received! The care team will be notified."

        try:
            await self._provider.send_text(msg.sender_phone, reply)
        except Exception as exc:
            logger.error("whatsapp_service.reply_failed", error=str(exc))
