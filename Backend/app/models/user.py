from datetime import datetime
from typing import Any
from uuid import UUID

from app.models.base import ORMBase


class User(ORMBase):
    id: UUID
    phone_number: str | None = None
    email: str | None = None
    auth_provider: str
    name: str
    role: str = "family_caregiver"
    preferences: dict[str, Any] = {}
    created_at: datetime | None = None
    last_login_at: datetime | None = None
