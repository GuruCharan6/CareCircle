from __future__ import annotations

from uuid import UUID

import asyncpg

from app.models.notification import Notification
from app.repositories.notification_repository import NotificationRepository


class NotificationService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._repo = NotificationRepository(conn)

    async def list(
        self,
        patient_id: UUID,
        status: str | None = None,
        limit: int = 50,
    ) -> list[Notification]:
        # Map frontend "unread" filter to backend NOT IN ('read','failed')
        if status == "unread":
            rows = await self._repo.get_by_patient_id(patient_id, status=None, limit=limit)
            return [n for n in rows if n.status not in ("read", "failed")]
        return await self._repo.get_by_patient_id(patient_id, status=status, limit=limit)

    async def mark_read(self, patient_id: UUID, notification_ids: list[UUID]) -> int:
        count = 0
        for nid in notification_ids:
            notif = await self._repo.get_by_id(nid)
            if notif and notif.patient_id == patient_id:
                await self._repo.mark_read(nid)
                count += 1
        return count

    async def acknowledge(
        self,
        patient_id: UUID,
        notification_id: UUID,
        action: str,  # 'handled' | 'ongoing'
    ) -> Notification | None:
        """Acknowledge alert. Marks read. Only called on explicit user button tap."""
        notif = await self._repo.get_by_id(notification_id)
        if not notif or notif.patient_id != patient_id:
            return None
        return await self._repo.acknowledge(notification_id, action)

    async def unread_count(self, patient_id: UUID) -> int:
        """DB-level count — no Python loop."""
        return await self._repo.unread_count_for_patient(patient_id)
