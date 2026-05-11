from datetime import datetime
from uuid import UUID

from app.models.base import ORMBase


class DrugGenericLookup(ORMBase):
    id: UUID
    brand_name: str
    generic_name: str
    drug_class: str | None = None
    manufacturer: str | None = None
    country: str = "IN"
    data_source: str
    body_systems: list[str] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None
