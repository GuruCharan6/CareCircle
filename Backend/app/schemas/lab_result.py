from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class LabResultCreate(BaseModel):
    source_document_id: UUID | None = None
    test_name: str  # normalized: 'fasting_glucose' | 'HbA1c' | 'serum_creatinine'
    test_name_display: str  # human-readable: 'Fasting Glucose'
    value: Decimal | None = None
    unit: str | None = None  # 'mg/dL' | '%' | 'g/dL'
    reference_range_low: Decimal | None = None
    reference_range_high: Decimal | None = None
    is_abnormal: bool | None = None
    specialist_type: str | None = None  # 'endocrinology' | 'cardiology'
    lab_name: str | None = None
    test_date: date


class LabResultResponse(BaseModel):
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
    delta_from_prev: Decimal | None = None       # change from last reading
    rate_of_change: Decimal | None = None         # delta / days — trend speed
    prev_reading_id: UUID | None = None
    prev_reading_date: date | None = None
    created_at: datetime | None = None


class LabTrendItem(BaseModel):
    """For chatbot / dashboard trend display."""
    test_name_display: str
    test_date: date
    value: Decimal | None = None
    unit: str | None = None
    is_abnormal: bool | None = None
    delta_from_prev: Decimal | None = None
