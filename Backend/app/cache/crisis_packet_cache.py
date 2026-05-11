from __future__ import annotations

import json
from uuid import UUID

from app.cache.keys import CRISIS_PACKET_TTL, crisis_packet_key
from app.core.logging import get_logger
from app.core.redis import make_redis

logger = get_logger(__name__)


async def get_crisis_packet(patient_id: UUID) -> dict | None:
    """Return cached CrisisPacket dict or None on miss.
    Crisis packet is pre-computed nightly — cache gives zero-latency access on crisis tap.
    """
    try:
        async with make_redis() as redis:
            raw = await redis.get(crisis_packet_key(patient_id))
            if raw:
                logger.debug("crisis_packet_cache.hit", patient_id=str(patient_id))
                return json.loads(raw)
    except Exception as exc:
        logger.warning("crisis_packet_cache.get_error", patient_id=str(patient_id), error=str(exc))
    return None


async def set_crisis_packet(patient_id: UUID, packet: dict) -> None:
    """Cache CrisisPacket dict. Called by nightly_crisis_rebuild after DB upsert."""
    try:
        async with make_redis() as redis:
            await redis.setex(
                crisis_packet_key(patient_id),
                CRISIS_PACKET_TTL,
                json.dumps(packet, default=str),
            )
            logger.debug("crisis_packet_cache.set", patient_id=str(patient_id))
    except Exception as exc:
        logger.warning("crisis_packet_cache.set_error", patient_id=str(patient_id), error=str(exc))


async def invalidate_crisis_packet(patient_id: UUID) -> None:
    """Invalidate cached crisis packet — called when medications or contacts change."""
    try:
        async with make_redis() as redis:
            await redis.delete(crisis_packet_key(patient_id))
            logger.debug("crisis_packet_cache.invalidated", patient_id=str(patient_id))
    except Exception as exc:
        logger.warning("crisis_packet_cache.invalidate_error", patient_id=str(patient_id), error=str(exc))
