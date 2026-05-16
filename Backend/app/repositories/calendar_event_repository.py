from datetime import date, time
from typing import Any
from uuid import UUID

from app.models.calendar_event import CalendarEvent
from app.repositories.base import BaseRepository


class CalendarEventRepository(BaseRepository):
    async def get_by_id(self, event_id: UUID) -> CalendarEvent | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.calendar_events WHERE id = $1", event_id
        )
        return CalendarEvent.from_record(row) if row else None

    async def get_upcoming(
        self,
        patient_id: UUID,
        within_days: int = 30,
        status: str | None = None,
    ) -> list[CalendarEvent]:
        if status:
            rows = await self.conn.fetch(
                """
                SELECT * FROM public.calendar_events
                WHERE patient_id = $1
                  AND event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $2::int
                  AND status = $3
                ORDER BY event_date ASC
                """,
                patient_id, within_days, status,
            )
        else:
            rows = await self.conn.fetch(
                """
                SELECT * FROM public.calendar_events
                WHERE patient_id = $1
                  AND event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $2::int
                  AND status != 'cancelled'
                ORDER BY event_date ASC
                """,
                patient_id, within_days,
            )
        return [CalendarEvent.from_record(r) for r in rows]

    async def get_by_patient_id(self, patient_id: UUID) -> list[CalendarEvent]:
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.calendar_events
            WHERE patient_id = $1
            ORDER BY event_date DESC
            """,
            patient_id,
        )
        return [CalendarEvent.from_record(r) for r in rows]

    async def create(
        self,
        *,
        patient_id: UUID,
        event_type: str,
        title: str,
        event_date: date,
        source: str,
        status: str = "suggested",
        specialist_type: str | None = None,
        event_time: time | None = None,
        location: str | None = None,
        required_tests: list[str] | None = None,
        is_recurring: bool = False,
        recurrence_pattern: str | None = None,
        parent_event_id: UUID | None = None,
        caregiver_id: UUID | None = None,
        notes: str | None = None,
        confirmed_by: UUID | None = None,
    ) -> CalendarEvent:
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.calendar_events
              (patient_id, event_type, title, specialist_type,
               event_date, event_time, location, source,
               status, required_tests, is_recurring, recurrence_pattern,
               parent_event_id, caregiver_id, notes, confirmed_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
            RETURNING *
            """,
            patient_id, event_type, title, specialist_type,
            event_date, event_time, location, source,
            status, required_tests or [], is_recurring, recurrence_pattern,
            parent_event_id, caregiver_id, notes, confirmed_by,
        )
        return CalendarEvent.from_record(row)

    async def get_lab_tests_near_date(
        self,
        patient_id: UUID,
        ref_date: date,
        days_before: int = 7,
        days_after: int = 14,
    ) -> list[CalendarEvent]:
        """
        Return confirmed lab_test events where event_date falls between
        (ref_date - days_before) and (ref_date + days_after).

        Asymmetric: look back 7 days (event may have been scheduled before actual test),
        look forward 14 days (report may be uploaded days after test was done).
        This ensures any lab report uploaded before the appointment auto-completes
        the matching pending lab_test calendar event.
        """
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.calendar_events
            WHERE patient_id = $1
              AND event_type = 'lab_test'
              AND status = 'confirmed'
              AND event_date BETWEEN $2::date - $3::int AND $2::date + $4::int
            ORDER BY event_date ASC
            """,
            patient_id, ref_date, days_before, days_after,
        )
        return [CalendarEvent.from_record(r) for r in rows]

    async def confirm_all_lab_tests_on_date(
        self, patient_id: UUID, event_date: date, confirmed_by: UUID
    ) -> None:
        await self.conn.execute(
            """
            UPDATE public.calendar_events
            SET status = 'confirmed', confirmed_by = $3, updated_at = now()
            WHERE patient_id = $1
              AND event_type = 'lab_test'
              AND event_date = $2
              AND status = 'suggested'
            """,
            patient_id, event_date, confirmed_by,
        )

    async def update_event_date(self, event_id: UUID, new_date: date) -> CalendarEvent | None:
        """Correct event_date (e.g. when explicit follow-up date overrides a weeks-based estimate)."""
        row = await self.conn.fetchrow(
            """
            UPDATE public.calendar_events
            SET event_date = $2, updated_at = now()
            WHERE id = $1
            RETURNING *
            """,
            event_id, new_date,
        )
        return CalendarEvent.from_record(row) if row else None

    async def update_status(self, event_id: UUID, status: str, confirmed_by: UUID | None = None) -> CalendarEvent | None:
        row = await self.conn.fetchrow(
            """
            UPDATE public.calendar_events
            SET status = $2, confirmed_by = COALESCE($3, confirmed_by), updated_at = now()
            WHERE id = $1
            RETURNING *
            """,
            event_id, status, confirmed_by,
        )
        return CalendarEvent.from_record(row) if row else None

    async def update_tests_status(self, event_id: UUID, tests_status: dict[str, Any]) -> None:
        await self.conn.execute(
            "UPDATE public.calendar_events SET tests_status = $2, updated_at = now() WHERE id = $1",
            event_id, tests_status,
        )

    async def add_reminder_sent(self, event_id: UUID, level: str) -> None:
        await self.conn.execute(
            """
            UPDATE public.calendar_events
            SET reminder_sent_at = array_append(reminder_sent_at, $2)
            WHERE id = $1
            """,
            event_id, level,
        )

    async def delete(self, event_id: UUID) -> bool:
        result = await self.conn.execute(
            "DELETE FROM public.calendar_events WHERE id = $1", event_id
        )
        return result == "DELETE 1"

    async def delete_future_caregiver_visits(self, caregiver_id: UUID) -> None:
        """Delete all upcoming caregiver_visit events for a caregiver (used before regenerating schedule)."""
        await self.conn.execute(
            """
            DELETE FROM public.calendar_events
            WHERE caregiver_id = $1
              AND event_type = 'caregiver_visit'
              AND event_date >= CURRENT_DATE
              AND status != 'completed'
            """,
            caregiver_id,
        )

    async def cancel_future_caregiver_visits(self, caregiver_id: UUID) -> None:
        """Cancel upcoming caregiver_visit events when caregiver is removed."""
        await self.conn.execute(
            """
            UPDATE public.calendar_events
            SET status = 'cancelled', updated_at = now()
            WHERE caregiver_id = $1
              AND event_type = 'caregiver_visit'
              AND event_date >= CURRENT_DATE
              AND status != 'completed'
            """,
            caregiver_id,
        )
