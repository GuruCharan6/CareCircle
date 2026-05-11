from datetime import datetime
from uuid import UUID

from app.models.base import ORMBase


class ConflictRecord(ORMBase):
    id: UUID
    patient_id: UUID
    conflict_type: str
    source_a_type: str
    source_a_id: UUID
    source_a_dimension: str
    source_b_type: str
    source_b_id: UUID
    source_b_dimension: str
    conflict_description: str
    is_resolvable: bool
    meera_suggested_action: str | None = None
    status: str = "active"
    acknowledged_at: datetime | None = None
    resolved_at: datetime | None = None
    created_at: datetime | None = None
