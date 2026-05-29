from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from app.models.base import ORMBase


class LabResult(ORMBase):
    id: UUID
    patient_id: UUID
    source_document_id: UUID | None = None
    test_name: str
    test_name_display: str
    value: Decimal | None = None
    unit: str | None = None
    reference_range_low: Decimal | None = None
    reference_range_high: Decimal | None = None
    is_abnormal: bool | None = None
    specialist_type: str | None = None
    lab_name: str | None = None
    test_date: date
    delta_from_prev: Decimal | None = None
    rate_of_change: Decimal | None = None
    prev_reading_id: UUID | None = None
    prev_reading_date: date | None = None
    created_at: datetime | None = None
