from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.calendar import CalendarEventListItem


class DigestUpcomingEvent(BaseModel):
    event_id: UUID
    title: str
    event_date: date
    days_until: int
    tests_pending: list[str]  # test names still 'pending' for this appointment


class DigestRefillAlert(BaseModel):
    medication_id: UUID
    generic_name: str
    brand_name: str | None = None
    days_remaining: int
    urgency: str  # 'watch'|'alert'


class DigestDrugInteraction(BaseModel):
    drug_a: str
    drug_b: str
    severity: str | None = None
    urgency: str  # 'alert'|'watch'|'inform'
    note: str | None = None


class DigestResponse(BaseModel):
    """Morning or evening digest — three-part structure from Layer 5 reasoning."""
    period: str            # 'morning'|'evening'
    generated_at: datetime
    overall_status: str    # 'ok'|'watch'|'alert'
    today_summary: str     # one sentence — Layer 5 plain-language output

    # Part 1 — What We Know
    known_facts: list[str]  # high-confidence sourced facts

    # Part 2 — What Evidence Suggests
    hypotheses: list[str]   # hypothesis statements from rules engine (Layer 3 output)

    # Part 3 — What We Don't Know
    unknowns: list[str]     # named gaps + specific action for each

    needs_action: str | None = None  # one specific action or None if nothing urgent

    upcoming_events: list[CalendarEventListItem] = []  # next 3 events
    refill_alerts: list[DigestRefillAlert] = []
    drug_interactions: list[DigestDrugInteraction] = []
    staleness_flags: list[str] = []  # e.g. 'No caregiver note 4 days'

    # Upload CTA included in WhatsApp version — deep link token generated server-side
    upload_cta_token: str | None = None  # 15-min pre-auth JWT for WhatsApp CTA button


class DigestPreferencesUpdate(BaseModel):
    morning_time: str | None = None   # 'HH:MM' 24h format
    evening_time: str | None = None   # 'HH:MM' 24h format
    timezone: str | None = None       # IANA tz: 'Asia/Kolkata'
