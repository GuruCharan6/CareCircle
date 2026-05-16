import asyncio
import ssl
from urllib.parse import urlparse

import redis.asyncio as aioredis

from app.config import settings
from app.core.logging import logger

_redis: aioredis.Redis | None = None


def _make_client() -> aioredis.Redis:
    url = settings.redis_url
    if url.startswith("rediss://"):
        # Parse host/port/password from URL and use explicit Redis constructor
        # so ssl_cert_reqs=None is honoured (from_url doesn't forward it reliably)
        parsed = urlparse(url)
        return aioredis.Redis(
            host=parsed.hostname,
            port=parsed.port or 6380,
            password=parsed.password,
            username=parsed.username or "default",
            ssl=True,
            ssl_cert_reqs=None,
            socket_connect_timeout=5.0,
            socket_timeout=5.0,
            decode_responses=True,
        )
    return aioredis.from_url(
        url,
        encoding="utf-8",
        decode_responses=True,
        socket_connect_timeout=5.0,
        socket_timeout=5.0,
    )


def make_redis() -> aioredis.Redis:
    """Return a fresh Redis client bound to the *current* event loop."""
    return _make_client()


async def init_redis() -> None:
    global _redis
    try:
        _redis = _make_client()
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
