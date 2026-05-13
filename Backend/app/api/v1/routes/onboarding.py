from fastapi import APIRouter

from app.api.deps import CurrentUser, DBConn
from app.schemas.digest import DigestPreferencesUpdate
from app.services.onboarding_service import OnboardingService

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

# Steps 1-3 mandatory. Steps 4-5 optional (skippable, nudged).
# Progress in users.preferences.onboarding_completed_steps


@router.get("/progress")
async def get_progress(current_user: CurrentUser, conn: DBConn) -> dict:
    """Return completed steps, pending steps, mandatory_complete flag."""
    svc = OnboardingService(conn)
    return await svc.get_progress(current_user.id)


@router.post("/step/{step_num}/complete")
async def mark_step_complete(
    step_num: int,
    current_user: CurrentUser,
    conn: DBConn,
) -> dict:
    """Mark onboarding step as done. Returns updated progress.
    Uses pre-fetched current_user — no extra DB read inside service.
    """
    svc = OnboardingService(conn)
    return await svc.mark_step_complete(current_user, step_num)


@router.get("/status")
async def get_status(current_user: CurrentUser, conn: DBConn) -> dict:
    """Quick check: mandatory steps (1-3) complete?"""
    svc = OnboardingService(conn)
    return {"complete": await svc.is_complete(current_user.id)}


@router.post("/reset")
async def reset_onboarding(current_user: CurrentUser, conn: DBConn) -> dict:
    """Clear progress to restart flow for a new patient."""
    svc = OnboardingService(conn)
    return await svc.reset_onboarding(current_user)


@router.post("/digest-times")
async def set_digest_times(
    body: DigestPreferencesUpdate,
    current_user: CurrentUser,
    conn: DBConn,
) -> dict:
    """Step 3: set morning + evening digest times + timezone.
    Merged into single DB write — sets times + marks step 3 complete atomically.
    """
    svc = OnboardingService(conn)
    if body.morning_time and body.evening_time and body.timezone:
        return await svc.set_digest_times_and_complete(
            current_user,
            morning_time=body.morning_time,
            evening_time=body.evening_time,
            timezone=body.timezone,
        )
    return {"message": "Digest preferences saved"}
