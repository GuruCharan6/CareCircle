from __future__ import annotations
from datetime import date, timedelta
from typing import List

from uuid import UUID

import asyncpg

from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.logging import get_logger
from app.models.caregiver import Caregiver
from app.providers.whatsapp.factory import get_whatsapp_provider
from app.repositories.caregiver_repository import CaregiverRepository
from app.repositories.calendar_event_repository import CalendarEventRepository
from app.schemas.caregiver import CaregiverCreate

logger = get_logger(__name__)

_WEEKDAY_MAP = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}


class CaregiverService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._repo = CaregiverRepository(conn)
        self._cal_repo = CalendarEventRepository(conn)

    async def add(self, patient_id: UUID, user_id: UUID, data: CaregiverCreate) -> Caregiver:
        caregiver = await self._repo.create(
            patient_id=patient_id,
            added_by=user_id,
            name=data.name,
            phone_number=data.phone_number,
            visit_schedule=data.visit_schedule,
            visit_start_time=data.visit_start_time,
            visit_end_time=data.visit_end_time,
            notes=data.notes,
        )
        await self._send_invitation(caregiver)
        await self._generate_visit_events(caregiver)
        return caregiver

    async def _send_invitation(self, caregiver: Caregiver) -> None:
        provider = get_whatsapp_provider()
        try:
            body = (
                f"Hello {caregiver.name}! You've been added as a caregiver on CareCircle. "
                "Reply YES to confirm, or NO to decline."
            )
            await provider.send_text(caregiver.phone_number, body)
            await self._repo.mark_invitation_sent(caregiver.id)
        except Exception as exc:
            logger.error(
                "caregiver_service.invitation_failed",
                caregiver_id=str(caregiver.id),
                error=str(exc),
            )

    async def list(self, patient_id: UUID, active_only: bool = True) -> List[Caregiver]:
        return await self._repo.get_by_patient_id(patient_id, active_only=active_only)

    async def get(self, patient_id: UUID, caregiver_id: UUID) -> Caregiver:
        caregiver = await self._repo.get_by_id(caregiver_id)
        if not caregiver:
            raise NotFoundError("Caregiver", str(caregiver_id))
        if caregiver.patient_id != patient_id:
            raise ForbiddenError("Access denied to this caregiver")
        return caregiver

    async def remove(self, patient_id: UUID, caregiver_id: UUID) -> None:
        caregiver = await self.get(patient_id, caregiver_id)
        await self._repo.update_invitation_status(caregiver.id, "inactive")
        await self._cal_repo.cancel_future_caregiver_visits(caregiver.id)

    async def reinvite(self, patient_id: UUID, caregiver_id: UUID) -> None:
        caregiver = await self.get(patient_id, caregiver_id)
        await self._send_invitation(caregiver)

    async def update(self, patient_id: UUID, caregiver_id: UUID, data: CaregiverCreate) -> Caregiver:
        await self.get(patient_id, caregiver_id)  # Access check
        updated = await self._repo.update(
            caregiver_id=caregiver_id,
            name=data.name,
            phone_number=data.phone_number,
            visit_schedule=data.visit_schedule,
            visit_start_time=data.visit_start_time,
            visit_end_time=data.visit_end_time,
            notes=data.notes,
        )
        # Regenerate visit events when schedule changes
        await self._cal_repo.delete_future_caregiver_visits(caregiver_id)
        await self._generate_visit_events(updated)
        return updated

    async def _generate_visit_events(self, caregiver: Caregiver) -> None:
        """Create confirmed caregiver_visit calendar events for next 14 days."""
        if not caregiver.visit_schedule:
            return

        scheduled_weekdays = {
            _WEEKDAY_MAP[day]
            for day in caregiver.visit_schedule
            if day in _WEEKDAY_MAP
        }
        if not scheduled_weekdays:
            return

        today = date.today()
        end = today + timedelta(days=14)
        current = today

        while current <= end:
            if current.weekday() in scheduled_weekdays:
                time_range = ""
                if caregiver.visit_start_time and caregiver.visit_end_time:
                    time_range = (
                        f" ({caregiver.visit_start_time.strftime('%H:%M')}"
                        f"–{caregiver.visit_end_time.strftime('%H:%M')})"
                    )
                elif caregiver.visit_start_time:
                    time_range = f" from {caregiver.visit_start_time.strftime('%H:%M')}"

                await self._cal_repo.create(
                    patient_id=caregiver.patient_id,
                    event_type="caregiver_visit",
                    title=f"Caregiver Visit — {caregiver.name}{time_range}",
                    event_date=current,
                    source="caregiver_schedule",
                    status="confirmed",
                    caregiver_id=caregiver.id,
                    event_time=caregiver.visit_start_time,
                    notes=caregiver.notes,
                )
                logger.info(
                    "caregiver_service.visit_event_created",
                    caregiver_id=str(caregiver.id),
                    date=str(current),
                )
            current += timedelta(days=1)
