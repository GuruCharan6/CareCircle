from datetime import datetime
from uuid import UUID

from app.models.base import ORMBase


class Prescriber(ORMBase):
    id: UUID
    patient_id: UUID
    name: str
    specialty: str | None = None
    hospital: str | None = None
    phone: str | None = None
    status: str = "active"  # 'active' | 'inactive'
    notes: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
