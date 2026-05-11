from typing import Any
from uuid import UUID

from app.models.notification import Notification
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository):
    async def get_by_id(self, notification_id: UUID) -> Notification | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.notifications WHERE id = $1", notification_id
        )
        return Notification.from_record(row) if row else None

    async def get_by_patient_id(
        self,
        patient_id: UUID,
        status: str | None = None,
        limit: int = 50,
    ) -> list[Notification]:
        # Exclude system_event channel — those are audit trail only, not user-visible.
        if status:
            rows = await self.conn.fetch(
                """
                SELECT * FROM public.notifications
                WHERE patient_id = $1
                  AND status = $2
                  AND channel != 'system_event'
                ORDER BY created_at DESC
                LIMIT $3
                """,
                patient_id, status, limit,
            )
        else:
            rows = await self.conn.fetch(
                """
                SELECT * FROM public.notifications
                WHERE patient_id = $1
                  AND channel != 'system_event'
                ORDER BY created_at DESC
                LIMIT $2
                """,
                patient_id, limit,
            )
        return [Notification.from_record(r) for r in rows]

    async def get_pending(self, limit: int = 100) -> list[Notification]:
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.notifications
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT $1
            """,
            limit,
        )
        return [Notification.from_record(r) for r in rows]

    async def create(
        self,
        *,
        patient_id: UUID,
        type: str,
        channel: str,
        title: str,
        body: str,
        recipient_user_id: UUID | None = None,
        recipient_caregiver_id: UUID | None = None,
        action_deep_link: str | None = None,
        linked_entity_type: str | None = None,
        linked_entity_id: UUID | None = None,
        digest_period: str | None = None,
        digest_content: dict[str, Any] | None = None,
    ) -> Notification:
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.notifications
              (patient_id, recipient_user_id, recipient_caregiver_id,
               type, channel, title, body,
               action_deep_link, linked_entity_type, linked_entity_id,
               digest_period, digest_content)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            RETURNING *
            """,
            patient_id, recipient_user_id, recipient_caregiver_id,
            type, channel, title, body,
            action_deep_link, linked_entity_type, linked_entity_id,
            digest_period, digest_content,
        )
        return Notification.from_record(row)

    async def mark_sent(self, notification_id: UUID) -> None:
        await self.conn.execute(
            """
            UPDATE public.notifications
            SET status = 'sent', sent_at = now()
            WHERE id = $1
            """,
            notification_id,
        )

    async def mark_read(self, notification_id: UUID) -> None:
        await self.conn.execute(
            """
            UPDATE public.notifications
            SET status = 'read', read_at = now()
            WHERE id = $1
            """,
            notification_id,
        )

    async def mark_failed(self, notification_id: UUID, error: str) -> None:
        await self.conn.execute(
            """
            UPDATE public.notifications
            SET status = 'failed', error_message = $2
            WHERE id = $1
            """,
            notification_id, error,
        )

    async def acknowledge(
        self,
        notification_id: UUID,
        action: str,  # 'handled' | 'ongoing'
    ) -> Notification | None:
        """
        Mark notification as acknowledged + read.
        Only increments badge decrement if status was not already read.
        Returns updated notification or None if not found.
        """
        row = await self.conn.fetchrow(
            """
            UPDATE public.notifications
            SET status = 'read',
                read_at = now(),
                acknowledged_at = now(),
                acknowledge_action = $2
            WHERE id = $1
            RETURNING *
            """,
            notification_id, action,
        )
        return Notification.from_record(row) if row else None

    async def unread_count_for_patient(self, patient_id: UUID) -> int:
        """Count user-visible notifications that are not read or failed. Excludes audit-only system_event channel."""
        row = await self.conn.fetchrow(
            """
            SELECT COUNT(*) as cnt FROM public.notifications
            WHERE patient_id = $1
              AND status NOT IN ('read', 'failed')
              AND channel != 'system_event'
            """,
            patient_id,
        )
        return row["cnt"] if row else 0
