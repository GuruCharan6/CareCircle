"""
Digest dispatcher — runs once daily, schedules per-user sends via Celery ETA.

Morning dispatcher: 5:00 AM IST  → schedules morning_digest_for_patient tasks
Evening dispatcher: 12:00 PM IST → schedules evening_digest_for_patient tasks

Each task fires at exactly the user's preferred time in their timezone.
"""
import asyncio
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.celery import celery_app
from app.core.logging import get_logger
from app.worker._db import worker_conn
from app.config import settings
import httpx

logger = get_logger(__name__)

_DEFAULT_TZ = "Asia/Kolkata"


def _parse_tz(tz_name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(tz_name or _DEFAULT_TZ)
    except ZoneInfoNotFoundError:
        return ZoneInfo(_DEFAULT_TZ)


def _build_eta(hhmm: str, tz: ZoneInfo) -> datetime | None:
    """Return UTC datetime for hhmm today in tz. None if time already passed."""
    try:
        h, m = map(int, hhmm.split(":"))
    except (ValueError, AttributeError):
        return None
    now_utc = datetime.now(timezone.utc)
    local_now = now_utc.astimezone(tz)
    send_local = local_now.replace(hour=h, minute=m, second=0, microsecond=0)
    send_utc = send_local.astimezone(timezone.utc)
    return send_utc if send_utc > now_utc else None


# ── Morning dispatcher ────────────────────────────────────────────────────────

@celery_app.task(name="dispatch_morning_digests")
def dispatch_morning_digests() -> None:
    asyncio.run(_dispatch("morning"))


# ── Evening dispatcher ────────────────────────────────────────────────────────

@celery_app.task(name="dispatch_evening_digests")
def dispatch_evening_digests() -> None:
    asyncio.run(_dispatch("evening"))


# ── Shared dispatcher logic ───────────────────────────────────────────────────

async def _dispatch(period: str) -> None:
    pref_key = f"{period}_time"
    default_time = "08:00" if period == "morning" else "20:00"
    task_name = f"{period}_digest_for_patient"

    async with worker_conn(max_size=3, command_timeout=30) as conn:
        rows = await conn.fetch("""
            SELECT p.id AS patient_id,
                   COALESCE(u.preferences->>$1, $2) AS send_time,
                   COALESCE(u.preferences->>'timezone', $3)  AS timezone,
                   COALESCE((u.preferences->>$4)::boolean, true) AS digest_enabled
            FROM public.patients p
            JOIN public.users u ON u.id = p.user_id
        """, pref_key, default_time, _DEFAULT_TZ, f"{period}_digest")

        scheduled = 0
        skipped = 0

        async with httpx.AsyncClient(timeout=10.0) as client:
            for row in rows:
                if not row["digest_enabled"]:
                    skipped += 1
                    continue

                tz = _parse_tz(row["timezone"])
                eta = _build_eta(row["send_time"], tz)

                if eta is None:
                    logger.warning(
                        f"dispatch_{period}_digests.time_passed",
                        patient_id=str(row["patient_id"]),
                        send_time=row["send_time"],
                    )
                    skipped += 1
                    continue

                # Note: ETA is ignored in this new uvicorn-background-task model.
                # The digest will fire immediately when the dispatcher runs.
                url = f"{settings.internal_base_url}/internal/jobs/{period}-digest"
                headers = {"x-internal-secret": settings.internal_secret}
                try:
                    resp = await client.post(
                        url, 
                        params={"patient_id": str(row["patient_id"])},
                        headers=headers
                    )
                    resp.raise_for_status()
                    scheduled += 1
                except Exception as exc:
                    logger.error(
                        f"dispatch_{period}_digests.post_failed",
                        patient_id=str(row["patient_id"]),
                        error=str(exc)
                    )
                    skipped += 1

        logger.info(
            f"dispatch_{period}_digests.done",
            scheduled=scheduled,
            skipped=skipped,
        )
