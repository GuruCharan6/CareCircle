from __future__ import annotations

import json
from uuid import UUID

from app.cache.keys import PATIENT_STATE_TTL, patient_state_key
from app.core.logging import get_logger
from app.core.redis import make_redis

logger = get_logger(__name__)


async def get_patient_state(patient_id: UUID) -> dict | None:
    """Return cached PatientState dict or None on miss."""
    try:
        async with make_redis() as redis:
            raw = await redis.get(patient_state_key(patient_id))
            if raw:
                logger.debug("patient_state_cache.hit", patient_id=str(patient_id))
                return json.loads(raw)
    except Exception as exc:
        logger.warning("patient_state_cache.get_error", patient_id=str(patient_id), error=str(exc))
    return None


async def set_patient_state(patient_id: UUID, state: dict) -> None:
    """Cache PatientState dict. Silently ignores Redis errors (cache is best-effort)."""
    try:
        async with make_redis() as redis:
            await redis.setex(
                patient_state_key(patient_id),
                PATIENT_STATE_TTL,
                json.dumps(state, default=str),
            )
            logger.debug("patient_state_cache.set", patient_id=str(patient_id))
    except Exception as exc:
        logger.warning("patient_state_cache.set_error", patient_id=str(patient_id), error=str(exc))


async def invalidate_patient_state(patient_id: UUID) -> None:
    """Delete cached patient state. Called after rebuild."""
    try:
        async with make_redis() as redis:
            await redis.delete(patient_state_key(patient_id))
            logger.debug("patient_state_cache.invalidated", patient_id=str(patient_id))
    except Exception as exc:
        logger.warning("patient_state_cache.invalidate_error", patient_id=str(patient_id), error=str(exc))
