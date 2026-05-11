from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DBConn
from app.schemas.document import (
    DocumentApproveRequest,
    DocumentListItem,
    DocumentRejectRequest,
    DocumentResponse,
    SignedUploadURLRequest,
    SignedUploadURLResponse,
)
from app.services.document_service import DocumentService

router = APIRouter(tags=["documents"])

# Two upload entry points per SystemDesign:
# 1. CTA button in WhatsApp digest → /upload?token=<jwt> deep link
# 2. OS share sheet → app intercepts, calls this same API
# Both feed same upload → approval → storage flow.


@router.post(
    "/patients/{patient_id}/documents/upload-url",
    response_model=SignedUploadURLResponse,
    status_code=201,
)
async def get_upload_url(
    patient_id: UUID,
    body: SignedUploadURLRequest,
    current_user: CurrentUser,
    conn: DBConn,
) -> SignedUploadURLResponse:
    """Generate signed upload URL (PUT directly to Supabase Storage).
    Returns doc_id — client POSTs /approve after upload completes.
    Backend never handles file bytes.
    """
    svc = DocumentService(conn)
    return await svc.generate_upload_url(patient_id, current_user.id, body)


@router.post("/documents/{doc_id}/process", response_model=DocumentResponse)
async def process_document(
    doc_id: UUID,
    current_user: CurrentUser,
    conn: DBConn,
) -> DocumentResponse:
    """Trigger AI extraction for a document after it has been uploaded to storage.
    Client calls this after successful PUT to Supabase Storage.
    """
    svc = DocumentService(conn)
    await svc.trigger_extraction(doc_id, current_user.id)
    doc = await svc.get_with_signed_url(doc_id, current_user.id)
    return _to_response(doc)


@router.post("/documents/{doc_id}/approve", response_model=DocumentResponse)
async def approve_document(
    doc_id: UUID,
    body: DocumentApproveRequest,
    current_user: CurrentUser,
    conn: DBConn,
) -> DocumentResponse:
    """User confirms extracted data (may have inline-edited fields).
    Non-negotiable: every ingestion requires approval before DB storage.
    After approval → pipeline fires (Phase 8 Celery).
    """
    svc = DocumentService(conn)
    doc = await svc.approve(doc_id, current_user.id, body)
    return _to_response(doc)


@router.post("/documents/{doc_id}/reject", response_model=DocumentResponse)
async def reject_document(
    doc_id: UUID,
    body: DocumentRejectRequest,
    current_user: CurrentUser,
    conn: DBConn,
) -> DocumentResponse:
    """User rejects extracted data. File stays in storage (audit trail)."""
    svc = DocumentService(conn)
    doc = await svc.reject(doc_id, current_user.id, body.rejection_reason)
    return _to_response(doc)


@router.get("/patients/{patient_id}/documents", response_model=list[DocumentListItem])
async def list_documents(
    patient_id: UUID,
    current_user: CurrentUser,
    conn: DBConn,
    document_type: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[DocumentListItem]:
    """List documents with optional type + status filters.
    Used by Documents tab — grouped by month, filterable by type.
    """
    svc = DocumentService(conn)
    docs = await svc.list_by_patient(
        patient_id,
        document_type=document_type,
        status=status,
        limit=limit,
        offset=offset,
    )
    return [
        DocumentListItem(
            id=d.id,
            document_type=d.document_type,
            ingestion_source=d.ingestion_source,
            extraction_status=d.extraction_status,
            event_date=d.event_date,
            file_size_bytes=d.file_size_bytes,
            extracted_data=d.extracted_data,
            created_at=d.created_at,
        )
        for d in docs
    ]


@router.get("/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: UUID,
    current_user: CurrentUser,
    conn: DBConn,
) -> DocumentResponse:
    """Fetch single document with fresh signed URL (1h expiry).
    Signed URL regenerated on every access — never permanent public links.
    """
    svc = DocumentService(conn)
    doc = await svc.get_with_signed_url(doc_id, current_user.id)
    return _to_response(doc)


@router.patch("/documents/{doc_id}", response_model=DocumentResponse)
async def update_document(
    doc_id: UUID,
    body: DocumentApproveRequest, # Reuse schema for simplicity
    current_user: CurrentUser,
    conn: DBConn,
) -> DocumentResponse:
    """Update document extraction results manually.
    Used for correcting AI errors after approval.
    """
    svc = DocumentService(conn)
    doc = await svc.update_data(doc_id, current_user.id, body)
    return _to_response(doc)


@router.delete("/documents/{doc_id}", status_code=204)
async def delete_document(
    doc_id: UUID,
    current_user: CurrentUser,
    conn: DBConn,
) -> None:
    """Hard delete a document from record and storage.
    Used for removing unnecessary or duplicate files.
    """
    svc = DocumentService(conn)
    await svc.delete(doc_id, current_user.id)
    return None


def _to_response(doc) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        patient_id=doc.patient_id,
        uploaded_by=doc.uploaded_by,
        caregiver_id=doc.caregiver_id,
        document_type=doc.document_type,
        ingestion_source=doc.ingestion_source,
        file_url=doc.file_url,
        file_mime_type=doc.file_mime_type,
        file_size_bytes=doc.file_size_bytes,
        extraction_status=doc.extraction_status,
        extracted_text=doc.extracted_text,
        extracted_data=doc.extracted_data,
        field_confidence=doc.field_confidence,
        user_approved_at=doc.user_approved_at,
        rejection_reason=doc.rejection_reason,
        event_date=doc.event_date,
        created_at=doc.created_at,
    )
