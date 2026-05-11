from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PrescriberCreate(BaseModel):
    name: str
    specialty: str | None = None   # 'Cardiology' | 'Endocrinology' | 'General'
    hospital: str | None = None
    phone: str | None = None
    notes: str | None = None


class PrescriberUpdate(BaseModel):
    name: str | None = None
    specialty: str | None = None
    hospital: str | None = None
    phone: str | None = None
    notes: str | None = None


class PrescriberResponse(BaseModel):
    id: UUID
    patient_id: UUID
    name: str
    specialty: str | None = None
    hospital: str | None = None
    phone: str | None = None
    status: str                    # 'active' | 'inactive'
    notes: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
