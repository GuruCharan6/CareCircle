from datetime import datetime
from typing import Any
from uuid import UUID

from app.models.base import ORMBase


class Notification(ORMBase):
    id: UUID
    patient_id: UUID
    recipient_user_id: UUID | None = None
    recipient_caregiver_id: UUID | None = None
    type: str
    channel: str
    direction: str = "outbound"
    title: str
    body: str
    action_deep_link: str | None = None
    linked_entity_type: str | None = None
    linked_entity_id: UUID | None = None
    digest_period: str | None = None
    digest_content: dict[str, Any] | None = None
    sent_at: datetime | None = None
    delivered_at: datetime | None = None
    read_at: datetime | None = None
    status: str = "pending"
    error_message: str | None = None
    acknowledged_at: datetime | None = None
    acknowledge_action: str | None = None  # 'handled' | 'ongoing' | None
    created_at: datetime | None = None

    @property
    def is_unread(self) -> bool:
        """Unread = not yet read AND not failed. For actionable types, requires acknowledge."""
        return self.status not in ("read", "failed")

    @property
    def requires_acknowledge(self) -> bool:
        """True for alert types that need explicit user action."""
        return self.type in ("alert", "drug_interaction_alert", "crisis_follow_up")
