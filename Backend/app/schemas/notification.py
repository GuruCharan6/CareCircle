from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, computed_field


class NotificationResponse(BaseModel):
    id: UUID
    patient_id: UUID
    recipient_user_id: UUID | None = None
    recipient_caregiver_id: UUID | None = None
    type: str       # 'alert'|'drug_interaction_alert'|'watch_event_card'|'refill_reminder'|
                    # 'calendar_reminder'|'staleness_notice'|'crisis_follow_up'|'morning_digest'|...
    channel: str    # 'push'|'whatsapp'|'in_app'
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
    status: str     # 'pending'|'sent'|'delivered'|'read'|'failed'
    error_message: str | None = None
    acknowledged_at: datetime | None = None
    acknowledge_action: str | None = None  # 'handled'|'ongoing'|None
    created_at: datetime | None = None

    @computed_field
    @property
    def is_unread(self) -> bool:
        return self.status not in ("read", "failed")

    @computed_field
    @property
    def requires_acknowledge(self) -> bool:
        """Alert types need explicit Handled/Ongoing tap before marking read."""
        return self.type in ("alert", "drug_interaction_alert", "crisis_follow_up")


class MarkReadRequest(BaseModel):
    notification_ids: list[UUID]


class AcknowledgeRequest(BaseModel):
    action: str  # 'handled' | 'ongoing'


class UnreadCountResponse(BaseModel):
    unread_count: int
