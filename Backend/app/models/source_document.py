from datetime import date, datetime
from typing import Any
from uuid import UUID

from app.models.base import ORMBase


class SourceDocument(ORMBase):
    id: UUID
    patient_id: UUID
    uploaded_by: UUID | None = None
    caregiver_id: UUID | None = None
    document_type: str
    ingestion_source: str
    file_url: str
    file_mime_type: str
    file_size_bytes: int | None = None
    extraction_status: str = "pending"
    extracted_text: str | None = None
    extracted_data: dict[str, Any] | None = None
    field_confidence: dict[str, Any] = {}
    user_approved_at: datetime | None = None
    rejection_reason: str | None = None
    event_date: date | None = None
    content_hash: str | None = None
    # embedding: vector(1536) — returned as list[float] by pgvector codec
    embedding: list[float] | None = None
    created_at: datetime | None = None
