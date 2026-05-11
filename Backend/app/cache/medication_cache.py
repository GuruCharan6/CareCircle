from __future__ import annotations

import json
from uuid import UUID

from app.cache.keys import MEDICATION_LIST_TTL, medication_list_key
from app.core.logging import get_logger
from app.core.redis import make_redis

logger = get_logger(__name__)


async def get_active_medications(patient_id: UUID) -> list[dict] | None:
    """Return cached active medication list or None on miss.
    Dashboard, chatbot, and briefing all read active meds frequently.
    """
    try:
        async with make_redis() as redis:
            raw = await redis.get(medication_list_key(patient_id))
            if raw:
                logger.debug("medication_cache.hit", patient_id=str(patient_id))
                return json.loads(raw)
    except Exception as exc:
        logger.warning("medication_cache.get_error", patient_id=str(patient_id), error=str(exc))
    return None


async def set_active_medications(patient_id: UUID, meds: list[dict]) -> None:
    """Cache active medication list. TTL = 10 min."""
    try:
        async with make_redis() as redis:
            await redis.setex(
                medication_list_key(patient_id),
                MEDICATION_LIST_TTL,
                json.dumps(meds, default=str),
            )
            logger.debug("medication_cache.set", patient_id=str(patient_id), count=len(meds))
    except Exception as exc:
        logger.warning("medication_cache.set_error", patient_id=str(patient_id), error=str(exc))


async def invalidate_active_medications(patient_id: UUID) -> None:
    """Invalidate cached med list — called on create/discontinue/supersede."""
    try:
        async with make_redis() as redis:
            await redis.delete(medication_list_key(patient_id))
            logger.debug("medication_cache.invalidated", patient_id=str(patient_id))
    except Exception as exc:
        logger.warning("medication_cache.invalidate_error", patient_id=str(patient_id), error=str(exc))
