"""Shared utilities for scheduled jobs."""
from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import asyncpg

from app.config import settings
from app.core.logging import get_logger
from app.providers.push.fcm import FCMClient, FCMError, PushNotification

logger = get_logger(__name__)


def time_matches_now(preferred_hhmm: str, tz_name: str) -> bool:
    """Return True if current time in tz_name matches preferred_hhmm ('HH:MM')."""
    try:
        tz = ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        tz = ZoneInfo("Asia/Kolkata")
    return datetime.now(tz).strftime("%H:%M") == preferred_hhmm


async def get_all_patient_ids(conn: asyncpg.Connection) -> list[UUID]:
    """Return all patient IDs in the system."""
    rows = await conn.fetch("SELECT id FROM public.patients ORDER BY created_at ASC")
    return [r["id"] for r in rows]


async def get_user_id_for_patient(conn: asyncpg.Connection, patient_id: UUID) -> UUID | None:
    row = await conn.fetchrow(
        "SELECT user_id FROM public.patients WHERE id = $1", patient_id
    )
    return row["user_id"] if row else None


async def get_user_preferences(conn: asyncpg.Connection, user_id: UUID) -> dict:
    row = await conn.fetchrow(
        "SELECT preferences FROM public.users WHERE id = $1", user_id
    )
    if not row:
        return {}
    prefs = row["preferences"]
    if isinstance(prefs, str):
        import json
        prefs = json.loads(prefs)
    return prefs or {}


async def try_push(
    conn: asyncpg.Connection,
    user_id: UUID,
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    """
    Attempt FCM push to user's device.
    Reads fcm_token from user.preferences — no-op if token absent.
    Device token registration is handled by the mobile app at login.
    """
    prefs = await get_user_preferences(conn, user_id)
    if not prefs.get("notifications_push_enabled", True):
        return

    fcm_token = prefs.get("fcm_token")
    if not fcm_token:
        logger.debug("try_push.no_token", user_id=str(user_id))
        return

    try:
        client = FCMClient()
        await client.send(fcm_token, PushNotification(title=title, body=body, data=data))
    except FCMError as exc:
        logger.warning("try_push.fcm_error", user_id=str(user_id), error=str(exc))


async def try_whatsapp(
    conn: asyncpg.Connection,
    user_id: UUID,
    message: str,
) -> None:
    """
    Attempt to send WhatsApp message to user.
    Checks notifications_whatsapp_enabled in preferences.
    """
    row = await conn.fetchrow(
        "SELECT phone_number, preferences FROM public.users WHERE id = $1", user_id
    )
    if not row or not row["phone_number"]:
        return

    prefs = row["preferences"] or {}
    if isinstance(prefs, str):
        import json
        prefs = json.loads(prefs)

    if not prefs.get("notifications_whatsapp_enabled", True):
        return

    from app.providers.whatsapp.factory import get_whatsapp_provider
    provider = get_whatsapp_provider()
    try:
        await provider.send_text(row["phone_number"], message)
        logger.info("try_whatsapp.sent", user_id=str(user_id))
    except Exception as exc:
        logger.error("try_whatsapp.error", user_id=str(user_id), error=str(exc))


async def try_whatsapp_digest_cta(
    conn: asyncpg.Connection,
    user_id: UUID,
    patient_id: UUID,
    digest_body: str,
    cta_label: str = "Upload File",
) -> None:
    """Send morning/evening digest via WhatsApp with Upload File CTA button.

    Generates a 15-min pre-auth JWT embedded in the CTA URL so Meera can tap
    and land in the upload flow already authenticated — zero re-auth friction.

    Falls back to plain text if WhatsApp is disabled or phone number missing.
    """
    row = await conn.fetchrow(
        "SELECT phone_number, preferences FROM public.users WHERE id = $1", user_id
    )
    if not row or not row["phone_number"]:
        return

    prefs = row["preferences"] or {}
    if isinstance(prefs, str):
        import json
        prefs = json.loads(prefs)

    if not prefs.get("notifications_whatsapp_enabled", True):
        return

    from app.core.redis import make_redis
    from app.lib.upload_jwt import create_upload_jwt
    from app.lib.upload_shortlink import create_short_link
    from app.providers.whatsapp.factory import get_whatsapp_provider

    token = create_upload_jwt(user_id=user_id, patient_id=patient_id)
    redis = make_redis()
    try:
        code = await create_short_link(redis, token)
        cta_url = f"{settings.backend_base_url}/api/v1/r/{code}"
    finally:
        await redis.aclose()

    provider = get_whatsapp_provider()
    try:
        await provider.send_digest_with_cta(
            to=row["phone_number"],
            digest_body=digest_body,
            cta_url=cta_url,
            cta_label=cta_label,
        )
        logger.info("try_whatsapp_digest_cta.sent", user_id=str(user_id))
    except Exception as exc:
        logger.error("try_whatsapp_digest_cta.error", user_id=str(user_id), error=str(exc))


async def send_whatsapp_to_phone(
    phone_number: str,
    message: str,
) -> None:
    """Send WhatsApp message directly to a phone number."""
    from app.providers.whatsapp.factory import get_whatsapp_provider
    provider = get_whatsapp_provider()
    try:
        await provider.send_text(phone_number, message)
        logger.info("send_whatsapp_to_phone.sent", phone=phone_number)
    except Exception as exc:
        logger.error("send_whatsapp_to_phone.error", phone=phone_number, error=str(exc))
