from uuid import UUID

import asyncpg

from app.core.exceptions import ValidationError
from app.models.user import User
from app.repositories.user_repository import UserRepository

# 5-step onboarding. Steps 1-3 mandatory. Steps 4-5 optional (nudged, skippable).
# Progress stored in users.preferences.onboarding_completed_steps (JSONB list).

MANDATORY_STEPS = {1, 2, 3}
OPTIONAL_STEPS = {4, 5}
ALL_STEPS = MANDATORY_STEPS | OPTIONAL_STEPS

STEP_LABELS = {
    1: "Add patient profile",
    2: "Upload first document",
    3: "Set digest times",
    4: "Add caregiver",
    5: "Connect WhatsApp",
}


def _build_progress(completed: set[int]) -> dict:
    """Compute progress dict from in-memory completed set — no DB read."""
    pending = [s for s in sorted(ALL_STEPS) if s not in completed]
    mandatory_done = MANDATORY_STEPS.issubset(completed)
    return {
        "completed_steps": sorted(completed),
        "pending_steps": pending,
        "is_complete": mandatory_done,
        "mandatory_complete": mandatory_done,
        "step_labels": STEP_LABELS,
    }


class OnboardingService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._repo = UserRepository(conn)

    async def get_progress(self, user_id: UUID) -> dict:
        """Return completed steps, pending steps, and completion status."""
        user = await self._repo.get_by_id(user_id)
        if not user:
            return _build_progress(set())
        completed = set(user.preferences.get("onboarding_completed_steps", []))
        return _build_progress(completed)

    async def mark_step_complete(self, user: User, step: int) -> dict:
        """Mark onboarding step complete. Accepts pre-fetched User from dep — no extra DB read."""
        if step not in ALL_STEPS:
            raise ValidationError(
                f"Invalid step {step}. Valid steps: {sorted(ALL_STEPS)}"
            )

        prefs = dict(user.preferences)
        completed = set(prefs.get("onboarding_completed_steps", []))
        completed.add(step)
        prefs["onboarding_completed_steps"] = sorted(completed)

        await self._repo.update_preferences(user.id, prefs)
        return _build_progress(completed)

    async def set_digest_times_and_complete(
        self,
        user: User,
        morning_time: str,
        evening_time: str,
        timezone: str,
    ) -> dict:
        """Set digest prefs + mark step 3 complete in a single DB write."""
        prefs = dict(user.preferences)
        prefs["morning_digest_time"] = morning_time
        prefs["evening_digest_time"] = evening_time
        prefs["timezone"] = timezone

        completed = set(prefs.get("onboarding_completed_steps", []))
        completed.add(3)
        prefs["onboarding_completed_steps"] = sorted(completed)

        await self._repo.update_preferences(user.id, prefs)
        return _build_progress(completed)

    async def is_complete(self, user_id: UUID) -> bool:
        """True when all 3 mandatory steps done."""
        progress = await self.get_progress(user_id)
        return progress["mandatory_complete"]

    async def reset_onboarding(self, user: User) -> dict:
        """Clear onboarding progress to restart flow."""
        prefs = dict(user.preferences)
        prefs["onboarding_completed_steps"] = []
        await self._repo.update_preferences(user.id, prefs)
        return _build_progress(set())
