from uuid import UUID

import asyncpg

from app.core.exceptions import ValidationError
from app.repositories.user_repository import UserRepository

# 5-step onboarding. Steps 1-3 mandatory. Steps 4-5 optional (nudged, skippable).
# Progress stored in users.preferences.onboarding_completed_steps (JSONB list).
# SystemDesign: cannot skip steps 1-3, but system works without steps 4-5.

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


class OnboardingService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._repo = UserRepository(conn)

    async def get_progress(self, user_id: UUID) -> dict:
        """Return completed steps, pending steps, and completion status."""
        user = await self._repo.get_by_id(user_id)
        if not user:
            return {"completed_steps": [], "pending_steps": list(ALL_STEPS), "is_complete": False}

        completed = set(user.preferences.get("onboarding_completed_steps", []))
        pending = [s for s in sorted(ALL_STEPS) if s not in completed]
        mandatory_done = MANDATORY_STEPS.issubset(completed)

        return {
            "completed_steps": sorted(completed),
            "pending_steps": pending,
            "is_complete": mandatory_done,
            "mandatory_complete": mandatory_done,
            "step_labels": STEP_LABELS,
        }

    async def mark_step_complete(self, user_id: UUID, step: int) -> dict:
        """Mark onboarding step as complete. Returns updated progress."""
        if step not in ALL_STEPS:
            raise ValidationError(
                f"Invalid step {step}. Valid steps: {sorted(ALL_STEPS)}"
            )

        user = await self._repo.get_by_id(user_id)
        if not user:
            raise ValidationError("User not found")

        prefs = dict(user.preferences)
        completed = set(prefs.get("onboarding_completed_steps", []))
        completed.add(step)
        prefs["onboarding_completed_steps"] = sorted(completed)

        await self._repo.update_preferences(user_id, prefs)
        return await self.get_progress(user_id)

    async def is_complete(self, user_id: UUID) -> bool:
        """True when all 3 mandatory steps done. Steps 4-5 optional."""
        progress = await self.get_progress(user_id)
        return progress["mandatory_complete"]

    async def set_digest_times(
        self,
        user_id: UUID,
        morning_time: str,
        evening_time: str,
        timezone: str,
    ) -> None:
        """Step 3: store digest preferences. Required before step 3 can be marked complete."""
        user = await self._repo.get_by_id(user_id)
        if not user:
            raise ValidationError("User not found")

        prefs = dict(user.preferences)
        prefs["morning_digest_time"] = morning_time
        prefs["evening_digest_time"] = evening_time
        prefs["timezone"] = timezone

        await self._repo.update_preferences(user_id, prefs)

    async def reset_onboarding(self, user_id: UUID) -> dict:
        """Clear onboarding progress to allow adding another patient via the flow."""
        user = await self._repo.get_by_id(user_id)
        if not user:
            raise ValidationError("User not found")

        prefs = dict(user.preferences)
        prefs["onboarding_completed_steps"] = []
        await self._repo.update_preferences(user_id, prefs)
        return await self.get_progress(user_id)
