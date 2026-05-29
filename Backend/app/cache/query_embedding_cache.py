from __future__ import annotations

import json

from app.cache.keys import QUERY_EMBEDDING_TTL, query_embedding_key
from app.core.logging import get_logger
from app.core.redis import make_redis

logger = get_logger(__name__)


async def get_query_embedding(query: str) -> list[float] | None:
    try:
        async with make_redis() as redis:
            raw = await redis.get(query_embedding_key(query))
            if raw:
                logger.debug("query_embedding_cache.hit")
                return json.loads(raw)
    except Exception as exc:
        logger.warning("query_embedding_cache.get_error", error=str(exc))
    return None


async def set_query_embedding(query: str, embedding: list[float]) -> None:
    try:
        async with make_redis() as redis:
            await redis.setex(
                query_embedding_key(query),
                QUERY_EMBEDDING_TTL,
                json.dumps(embedding),
            )
    except Exception as exc:
        logger.warning("query_embedding_cache.set_error", error=str(exc))
