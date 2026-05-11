import redis.asyncio as aioredis

from app.config import settings
from app.core.logging import logger

_redis: aioredis.Redis | None = None


def make_redis() -> aioredis.Redis:
    """Return a fresh Redis client bound to the *current* event loop.

    Use this in Celery tasks (asyncio.run creates a new loop each call).
    Use get_redis() only in long-lived async contexts (FastAPI).
    """
    return aioredis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
        socket_connect_timeout=0.3,
        socket_timeout=0.5,
    )


async def init_redis() -> None:
    global _redis
    try:
        _redis = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        await _redis.ping()
        logger.info("redis_connected", url=settings.redis_url)
    except Exception as exc:
        logger.warning("redis_connection_failed", url=settings.redis_url, error=str(exc))
        _redis = None


async def close_redis() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None
        logger.info("redis_closed")


def get_redis() -> aioredis.Redis:
    if _redis is None:
        raise RuntimeError("Redis not initialised — call init_redis() first")
    return _redis
