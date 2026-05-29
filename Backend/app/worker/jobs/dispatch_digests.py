"""
Digest dispatcher — called by cron, directly invokes per-patient digest jobs.
"""
from datetime import UTC, datetime
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.celery import celery_app
from app.core.logging import get_logger
from app.worker._db import worker_conn

logger = get_logger(__name__)

_DEFAULT_TZ = "Asia/Kolkata"


def _parse_tz(tz_name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(tz_name or _DEFAULT_TZ)
    except ZoneInfoNotFoundError:
        return ZoneInfo(_DEFAULT_TZ)


def _should_send_now(hhmm: str, tz: ZoneInfo) -> bool:
    """Return True if the current local hour matches the scheduled hour.
    Minute is ignored — cron fires hourly, idempotency check prevents double-send."""
    try:
        h, _ = map(int, hhmm.split(":"))
    except (ValueError, AttributeError):
        return False
    now_utc = datetime.now(UTC)
    local_now = now_utc.astimezone(tz)
    return local_now.hour == h


# ── Morning dispatcher ────────────────────────────────────────────────────────

@celery_app.task(name="dispatch_morning_digests")
def dispatch_morning_digests() -> None:
    pass

async def async_dispatch_morning_digests() -> None:
    await _dispatch("morning")


# ── Evening dispatcher ────────────────────────────────────────────────────────

@celery_app.task(name="dispatch_evening_digests")
def dispatch_evening_digests() -> None:
    pass

async def async_dispatch_evening_digests() -> None:
    await _dispatch("evening")


# ── Shared dispatcher logic ───────────────────────────────────────────────────

async def _dispatch(period: str) -> None:
    # Keys must match what DigestService and OnboardingService write:
    #   morning_digest_time / evening_digest_time  (set via /onboarding/digest-times or PATCH /digest/preferences)
    #   whatsapp_digest  (boolean, set by auth flow and WhatsApp connect)
    pref_key = f"{period}_time"
    default_time = "08:00" if period == "morning" else "20:00"

    # Import here to avoid circular imports at module load time
    if period == "morning":
        from app.worker.jobs.morning_digest import _async_run as _run_digest
    else:
        from app.worker.jobs.evening_digest import _async_run as _run_digest

    # Fetch candidate patients with their preferences
    async with worker_conn(max_size=3, command_timeout=30) as conn:
        rows = await conn.fetch("""
            SELECT p.id AS patient_id,
                   COALESCE(u.preferences->>$1, $2) AS send_time,
                   COALESCE(u.preferences->>'timezone', $3)  AS timezone,
                   COALESCE((u.preferences->>'whatsapp_digest')::boolean, true) AS digest_enabled
            FROM public.patients p
            JOIN public.users u ON u.id = p.user_id
        """, pref_key, default_time, _DEFAULT_TZ)

    # Close the DB connection before running per-patient jobs so we don't
    # hold the pool open while each job opens its own connection.
    patient_ids: list[UUID] = []
    for row in rows:
        tz = _parse_tz(row["timezone"])
        if row["digest_enabled"] and _should_send_now(row["send_time"], tz):
            patient_ids.append(row["patient_id"])

    scheduled = 0
    skipped = len(rows) - len(patient_ids)

    for patient_id in patient_ids:
        try:
            await _run_digest(patient_id)
            scheduled += 1
        except Exception as exc:
            logger.error(
                f"dispatch_{period}_digests.patient_failed",
                patient_id=str(patient_id),
                error=str(exc),
            )
            skipped += 1

    logger.info(
        f"dispatch_{period}_digests.done",
        scheduled=scheduled,
        skipped=skipped,
    )
