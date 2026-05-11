from __future__ import annotations

import json
from uuid import UUID

from app.cache.keys import PHONE_OTP_TTL, phone_otp_key
from app.core.logging import get_logger
from app.core.redis import make_redis

logger = get_logger(__name__)


async def set_phone_otp(user_id: UUID, phone_number: str, otp: str) -> None:
    try:
        async with make_redis() as redis:
            await redis.setex(
                phone_otp_key(user_id),
                PHONE_OTP_TTL,
                json.dumps({"phone": phone_number, "otp": otp}),
            )
    except Exception as exc:
        logger.error("phone_otp_cache.set_error", user_id=str(user_id), error=str(exc))
        raise


async def get_phone_otp(user_id: UUID) -> dict | None:
    try:
        async with make_redis() as redis:
            raw = await redis.get(phone_otp_key(user_id))
            return json.loads(raw) if raw else None
    except Exception as exc:
        logger.error("phone_otp_cache.get_error", user_id=str(user_id), error=str(exc))
        return None


async def delete_phone_otp(user_id: UUID) -> None:
    try:
        async with make_redis() as redis:
            await redis.delete(phone_otp_key(user_id))
    except Exception as exc:
        logger.warning("phone_otp_cache.delete_error", user_id=str(user_id), error=str(exc))
