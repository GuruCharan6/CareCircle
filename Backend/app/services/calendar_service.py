from __future__ import annotations

from uuid import UUID

import asyncpg

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.calendar_event import CalendarEvent
from app.repositories.calendar_event_repository import CalendarEventRepository
from app.schemas.calendar import CalendarEventCreate, CalendarEventUpdate
from app.worker.events import on_appointment_confirmed


class CalendarService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._repo = CalendarEventRepository(conn)

    async def create(
        self, patient_id: UUID, user_id: UUID, data: CalendarEventCreate
    ) -> CalendarEvent:
        # Manual entries are confirmed by default
        status = "confirmed" if data.source == "manual" else "suggested"
        confirmed_by = user_id if status == "confirmed" else None

        event = await self._repo.create(
            patient_id=patient_id,
            event_type=data.event_type,
            title=data.title,
            event_date=data.event_date,
            source=data.source,
            status=status,
            confirmed_by=confirmed_by,
            specialist_type=data.specialist_type,
            event_time=data.event_time,
            location=data.location,
            required_tests=data.required_tests,
            is_recurring=data.is_recurring,
            recurrence_pattern=data.recurrence_pattern,
            parent_event_id=data.parent_event_id,
            notes=data.notes,
        )

        if status == "confirmed":
            on_appointment_confirmed(str(patient_id))

        return event

    async def list(
        self,
        patient_id: UUID,
        within_days: int = 30,
        status: str | None = None,
    ) -> list[CalendarEvent]:
        return await self._repo.get_upcoming(
            patient_id, within_days=within_days, status=status
        )

    async def get(self, patient_id: UUID, event_id: UUID) -> CalendarEvent:
        event = await self._repo.get_by_id(event_id)
        if not event:
            raise NotFoundError("CalendarEvent", str(event_id))
        if event.patient_id != patient_id:
            raise ForbiddenError("Access denied to this event")
        return event

    async def update(
        self, patient_id: UUID, event_id: UUID, data: CalendarEventUpdate
    ) -> CalendarEvent:
        await self.get(patient_id, event_id)
        if data.status is not None:
            await self._repo.update_status(event_id, data.status)
        if data.tests_status is not None:
            await self._repo.update_tests_status(event_id, data.tests_status)
        return await self.get(patient_id, event_id)

    async def confirm(
        self, patient_id: UUID, event_id: UUID, user_id: UUID
    ) -> CalendarEvent:
        event = await self.get(patient_id, event_id)
        updated = await self._repo.update_status(event_id, "confirmed", confirmed_by=user_id)
        if not updated:
            raise NotFoundError("CalendarEvent", str(event_id))
        # Cascade: confirm all suggested lab_tests on same date (grouped notification links only first)
        if event.event_type == "lab_test":
            await self._repo.confirm_all_lab_tests_on_date(
                patient_id, event.event_date, user_id
            )
        on_appointment_confirmed(str(patient_id))
        return updated

    async def cancel(self, patient_id: UUID, event_id: UUID) -> None:
        await self.get(patient_id, event_id)
        await self._repo.update_status(event_id, "cancelled")
