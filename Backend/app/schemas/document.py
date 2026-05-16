from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class SignedUploadURLRequest(BaseModel):
    document_type: str  # 'prescription'|'lab_report'|'doctor_note'|'voice_note'|'handwritten_note'|'other'
    ingestion_source: str  # 'app_upload'|'os_share_sheet'|'camera'
    file_mime_type: str
    file_size_bytes: int | None = None


class SignedUploadURLResponse(BaseModel):
    upload_url: str  # Supabase Storage signed upload URL (PUT to this)
    document_id: UUID  # pre-created source_documents row id
    expires_at: datetime  # when the signed URL expires


class DocumentApproveRequest(BaseModel):
    extracted_data: dict[str, Any]  # user-confirmed (possibly edited) structured fields
    extracted_text: str | None = None
    event_date: date | None = None  # actual date of medical event
    document_type: str | None = None  # override if user corrected doc type in review modal


class DocumentRejectRequest(BaseModel):
    rejection_reason: str


class DocumentResponse(BaseModel):
    id: UUID
    patient_id: UUID
    uploaded_by: UUID | None = None
    caregiver_id: UUID | None = None
    document_type: str
    ingestion_source: str
    file_url: str  # signed URL; regenerated on access, expires in 1h
    file_mime_type: str
    file_size_bytes: int | None = None
    extraction_status: str  # 'pending'|'extracting'|'review_required'|'approved'|'rejected'|'failed'
    extracted_text: str | None = None
    extracted_data: dict[str, Any] | None = None
    field_confidence: dict[str, Any]
    user_approved_at: datetime | None = None
    rejection_reason: str | None = None
    event_date: date | None = None
    created_at: datetime | None = None
    # embedding excluded — internal only


class DocumentListItem(BaseModel):
    id: UUID
    document_type: str
    ingestion_source: str
    extraction_status: str
    event_date: date | None = None
    file_size_bytes: int | None = None
    extracted_data: dict[str, Any] | None = None
    created_at: datetime | None = None
