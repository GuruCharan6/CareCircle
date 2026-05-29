from datetime import UTC, datetime
from uuid import UUID

import asyncpg

from app.cache.crisis_packet_cache import get_crisis_packet, set_crisis_packet
from app.core.logging import get_logger
from app.models.crisis_packet import CrisisPacket
from app.repositories.crisis_packet_repository import CrisisPacketRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.patient_repository import PatientRepository

logger = get_logger(__name__)

# Crisis trigger keywords (case-insensitive, exact substring match).
# Source: SystemDesign → Emergency Mode.
_CRISIS_KEYWORDS = frozenset({
    "chest pain",
    "not breathing",
    "collapsed",
    "fainted",
    "unconscious",
    "heart attack",
    "stroke",
    "seizure",
    "unresponsive",
    "can't breathe",
    "cannot breathe",
})

# Hours considered "unusual" for keyword detection (11 PM to 5 AM).
# Keyword match at unusual hours biases toward triggering. Explicit button tap always triggers.
_CRISIS_HOUR_START = 23  # 11 PM
_CRISIS_HOUR_END = 5     # 5 AM


class CrisisNotAvailableError(Exception):
    """Crisis packet not found for patient. Rebuild not yet run."""


class CrisisModeAgent:
    """
    State machine for crisis mode.

    States: NORMAL → CRISIS (on trigger) → NORMAL (on exit/timeout).

    Trigger sources:
      1. Explicit button tap (always triggers regardless of content or hour)
      2. Crisis keyword detected in chatbot query at unusual hours (11 PM – 5 AM)

    In crisis: fetch pre-computed packet from DB. Zero LLM call. Zero latency.
    All clinical info was computed nightly — just fetch and display.

    After crisis: log event, notify Meera in next morning digest.

    Bias toward triggering: cost of false alarm (showing crisis card for routine query) = low.
    Cost of missing real crisis signal = high.
    """

    def __init__(self, conn: asyncpg.Connection) -> None:
        self._conn = conn
        self._crisis_repo = CrisisPacketRepository(conn)
        self._notification_repo = NotificationRepository(conn)
        self._patient_repo = PatientRepository(conn)

    @staticmethod
    def is_crisis_query(text: str, current_hour: int | None = None) -> bool:
        """
        Determine whether a chatbot query should trigger crisis mode.

        Explicit button tap → call enter_crisis() directly (bypass this check).
        This method is for keyword-based detection from chatbot text input.

        At unusual hours (11 PM – 5 AM) any crisis keyword triggers.
        At normal hours, keywords still trigger — urgency bias is intentional.
        """
        lowered = text.lower()
        keyword_match = any(kw in lowered for kw in _CRISIS_KEYWORDS)

        if not keyword_match:
            return False

        # Log which keyword matched for audit
        matched = next((kw for kw in _CRISIS_KEYWORDS if kw in lowered), None)
        logger.info("crisis_mode_agent.keyword_detected", keyword=matched, hour=current_hour)
        return True

    @staticmethod
    def is_unusual_hour(hour: int | None = None) -> bool:
        """Returns True if the given hour falls in the 11 PM – 5 AM window."""
        h = hour if hour is not None else datetime.now(UTC).hour
        return h >= _CRISIS_HOUR_START or h < _CRISIS_HOUR_END

    async def enter_crisis(
        self,
        *,
        patient_id: UUID,
        triggered_by: str = "button_tap",
    ) -> CrisisPacket:
        """
        Enter crisis mode: fetch pre-computed packet, log access event.

        triggered_by: 'button_tap' | 'keyword_detection' | 'explicit_request'

        Raises CrisisNotAvailableError if no packet exists (rare — nightly rebuild covers all patients).
        Zero LLM call. Zero latency. Packet was built nightly at 3 AM.
        """
        # Redis cache → miss → asyncpg. Crisis packet = zero-latency on tap.
        cached = await get_crisis_packet(patient_id)
        if cached:
            logger.info("crisis_mode_agent.cache_hit", patient_id=str(patient_id))
            packet = CrisisPacket(**cached)
        else:
            packet = await self._crisis_repo.get_by_patient_id(patient_id)
            if packet is None:
                logger.error(
                    "crisis_mode_agent.packet_missing",
                    patient_id=str(patient_id),
                )
                raise CrisisNotAvailableError(
                    f"Crisis packet not found for patient {patient_id}. "
                    "Nightly rebuild may not have run yet."
                )
            await set_crisis_packet(patient_id, packet.model_dump(mode="json"))

        logger.info(
            "crisis_mode_agent.enter",
            patient_id=str(patient_id),
            triggered_by=triggered_by,
            packet_age_hours=self._packet_age_hours(packet),
        )

        # Log crisis access as notification event (for morning digest follow-up)
        patient = await self._patient_repo.get_by_id(patient_id)
        if patient:
            await self._notification_repo.create(
                patient_id=patient_id,
                recipient_user_id=patient.user_id,
                type="crisis_access",
                channel="system_event",
                title="Emergency information accessed",
                body=f"Emergency card opened (triggered by {triggered_by.replace('_', ' ')}).",
            )

        return packet

    async def exit_crisis(
        self,
        *,
        patient_id: UUID,
        resolved_by: str = "user_dismissed",
    ) -> None:
        """
        Exit crisis mode: log resolution, schedule morning-digest follow-up notification.

        resolved_by: 'user_dismissed' | 'timeout' | 'all_clear'
        """
        logger.info(
            "crisis_mode_agent.exit",
            patient_id=str(patient_id),
            resolved_by=resolved_by,
        )

        patient = await self._patient_repo.get_by_id(patient_id)
        if patient:
            await self._notification_repo.create(
                patient_id=patient_id,
                recipient_user_id=patient.user_id,
                type="watch_event_card",
                channel="in_app",
                title="After the emergency",
                body=(
                    "You accessed emergency information recently. "
                    "Want to update the caregiver or add notes about what happened?"
                ),
                action_deep_link=f"/patient/{patient_id}/log",
            )
            # Audit log on exit removed as per user request (only want 'accessed' event)

    @staticmethod
    def _packet_age_hours(packet: CrisisPacket) -> float:
        """How many hours old is the crisis packet."""
        now = datetime.now(UTC)
        generated = packet.generated_at
        if generated.tzinfo is None:
            generated = generated.replace(tzinfo=UTC)
        delta = now - generated
        return round(delta.total_seconds() / 3600, 1)
