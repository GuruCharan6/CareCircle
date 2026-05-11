from __future__ import annotations

import json

from app.cache.keys import DRUG_INTERACTION_TTL, drug_interaction_key
from app.core.logging import get_logger
from app.core.redis import make_redis

logger = get_logger(__name__)


async def get_interaction(drug_a: str, drug_b: str) -> dict | None:
    """Redis cache-aside for drug pair interaction results.

    Sits in front of DB 30-day cache: Redis (fast) → miss → DB check → miss → Gemini.
    30-day TTL matches the DB cache window in DrugInteractionRepository.get_recent_pair().
    """
    try:
        async with make_redis() as redis:
            raw = await redis.get(drug_interaction_key(drug_a, drug_b))
            if raw:
                logger.debug("drug_interaction_cache.hit", drug_a=drug_a, drug_b=drug_b)
                return json.loads(raw)
    except Exception as exc:
        logger.warning(
            "drug_interaction_cache.get_error",
            drug_a=drug_a, drug_b=drug_b, error=str(exc),
        )
    return None


async def set_interaction(drug_a: str, drug_b: str, result: dict) -> None:
    """Cache drug pair interaction result after Gemini returns. TTL = 30 days."""
    try:
        async with make_redis() as redis:
            await redis.setex(
                drug_interaction_key(drug_a, drug_b),
                DRUG_INTERACTION_TTL,
                json.dumps(result, default=str),
            )
            logger.debug("drug_interaction_cache.set", drug_a=drug_a, drug_b=drug_b)
    except Exception as exc:
        logger.warning(
            "drug_interaction_cache.set_error",
            drug_a=drug_a, drug_b=drug_b, error=str(exc),
        )
