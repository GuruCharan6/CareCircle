from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


class RefillCreate(BaseModel):
    medication_id: UUID
    days_supply: int  # 30 | 60 | 90 or user-entered
    prescription_start_date: date
    supply_source: str = "meera_input"  # 'meera_input'|'caregiver_voice_nlu'|'post_call_log_nlu'|'monthly_whatsapp_check'|'default_assumption_30d'
    notes: str | None = None

    @field_validator("days_supply")
    @classmethod
    def positive_supply(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("days_supply must be positive")
        return v


class RefillConfirmRequest(BaseModel):
    """Meera taps 'Refilled' — records that new supply was obtained."""
    refill_date: date
    days_supply: int | None = None  # if different from previous
    notes: str | None = None


class RefillResponse(BaseModel):
    id: UUID
    medication_id: UUID
    patient_id: UUID
    days_supply: int
    prescription_start_date: date
    refill_due_date: date  # prescription_start_date + days_supply - 7 (7-day buffer)
    supply_source: str
    is_default_assumption: bool  # true = system assumed 30d, Meera didn't confirm
    refill_confirmed_at: datetime | None = None
    reminder_sent_at: list[str]  # escalation levels sent: ['T-10', 'T-7', ...]
    notes: str | None = None
    created_at: datetime | None = None


class RefillStatusResponse(BaseModel):
    """Dashboard / digest refill status for a single medication."""
    medication_id: UUID
    generic_name: str
    brand_name: str | None = None
    refill_due_date: date
    days_remaining: int
    urgency: str  # 'ok'|'watch'|'alert'
    is_default_assumption: bool
