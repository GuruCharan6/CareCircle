from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from app.models.base import ORMBase


class LabResult(ORMBase):
    id: UUID
    patient_id: UUID
    source_document_id: Optional[UUID] = None
    test_name: str
    test_name_display: str
    value: Optional[Decimal] = None
    unit: Optional[str] = None
    reference_range_low: Optional[Decimal] = None
    reference_range_high: Optional[Decimal] = None
    is_abnormal: Optional[bool] = None
    specialist_type: Optional[str] = None
    lab_name: Optional[str] = None
    test_date: date
    delta_from_prev: Optional[Decimal] = None
    rate_of_change: Optional[Decimal] = None
    prev_reading_id: Optional[UUID] = None
    prev_reading_date: Optional[date] = None
    created_at: Optional[datetime] = None
