import asyncio
import ssl

import redis.asyncio as aioredis

from app.config import settings
from app.core.logging import logger

def _ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

_redis: aioredis.Redis | None = None


def _redis_kwargs() -> dict:
    kwargs: dict = {
        "encoding": "utf-8",
        "decode_responses": True,
        "socket_connect_timeout": 5.0,
        "socket_timeout": 5.0,
    }
    if settings.redis_url.startswith("rediss://"):
        kwargs["ssl_context"] = _ssl_context()
    return kwargs


def make_redis() -> aioredis.Redis:
    """Return a fresh Redis client bound to the *current* event loop.

    Use this in Celery tasks (asyncio.run creates a new loop each call).
    Use get_redis() only in long-lived async contexts (FastAPI).
    """
    return aioredis.from_url(settings.redis_url, **_redis_kwargs())


async def init_redis() -> None:
    global _redis
    try:
        _redis = aioredis.from_url(settings.redis_url, **_redis_kwargs())
        await asyncio.wait_for(_redis.ping(), timeout=5.0)
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
