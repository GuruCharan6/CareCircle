"""Short-link wrapper for WhatsApp upload CTA URLs.

Stores the full JWT in Redis under a random 8-char code.
WhatsApp message sends /r/{code} instead of the raw 400-char JWT.
"""
import secrets

import redis.asyncio as aioredis

_TTL_SECONDS = 900  # 15 min — matches upload JWT expiry
_PREFIX = "upload_link:"


def _key(code: str) -> str:
    return f"{_PREFIX}{code}"


async def create_short_link(redis: aioredis.Redis, jwt_token: str) -> str:
    """Store jwt_token in Redis, return the short code."""
    code = secrets.token_urlsafe(6)  # ~8 URL-safe chars
    await redis.set(_key(code), jwt_token, ex=_TTL_SECONDS)
    return code


async def resolve_short_link(redis: aioredis.Redis, code: str) -> str | None:
    """Return the JWT for code, or None if expired/not found."""
    return await redis.get(_key(code))
