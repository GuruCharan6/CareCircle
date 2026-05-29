from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import CurrentPatient, CurrentUser, DBConn
from app.schemas.common import SuccessResponse
from app.schemas.crisis import CrisisAccessLog, CrisisPacketResponse
from app.services.crisis_service import CrisisService

router = APIRouter(prefix="/patients/{patient_id}/crisis", tags=["crisis"])


class CrisisPdfResponse(BaseModel):
    signed_url: str
    expires_in_seconds: int = 3600


@router.get("", response_model=CrisisPacketResponse)
async def get_crisis_packet(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> CrisisPacketResponse:
    """Fetch pre-computed crisis packet. Logs access event for next morning digest."""
    svc = CrisisService(conn)
    return await svc.enter_crisis(patient_id, triggered_by="button_tap")


@router.post("/enter", response_model=CrisisPacketResponse)
async def enter_crisis(
    patient_id: UUID,
    body: CrisisAccessLog,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> CrisisPacketResponse:
    """Enter crisis mode. triggered_by: 'button_tap' | 'keyword_detection'."""
    svc = CrisisService(conn)
    return await svc.enter_crisis(patient_id, triggered_by=body.trigger)


@router.get("/pdf", response_model=CrisisPdfResponse)
async def get_crisis_pdf(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> CrisisPdfResponse:
    """Generate emergency card PDF and return signed download URL."""
    svc = CrisisService(conn)
    url = await svc.generate_crisis_pdf_url(patient_id)
    return CrisisPdfResponse(signed_url=url)


@router.post("/exit", response_model=SuccessResponse)
async def exit_crisis(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> SuccessResponse:
    """Exit crisis mode. Schedules follow-up notification in next morning digest."""
    svc = CrisisService(conn)
    await svc.exit_crisis(patient_id, resolved_by="user_dismissed")
    return SuccessResponse(message="Crisis mode exited")


class CrisisFollowUpRequest(BaseModel):
    response_text: str  # What the caregiver typed/said about what happened


class CrisisFollowUpResponse(BaseModel):
    message: str
    notification_id: str | None = None


@router.post("/follow-up", response_model=CrisisFollowUpResponse)
async def crisis_follow_up(
    patient_id: UUID,
    body: CrisisFollowUpRequest,
    current_patient: CurrentPatient,
    current_user: CurrentUser,
    conn: DBConn,
) -> CrisisFollowUpResponse:
    """
    Caregiver submits follow-up after emergency card was opened.
    Stores response as an in-app notification record for audit trail.
    Marks pending crisis_follow_up prompt notification as acknowledged.
    """
    from app.repositories.document_repository import DocumentRepository
    from app.repositories.notification_repository import NotificationRepository

    notif_repo = NotificationRepository(conn)
    doc_repo = DocumentRepository(conn)

    # Create source_document so the note appears in Observations (emergency_note type).
    # file_url='' for text-only notes — observation repo handles missing audio gracefully.
    doc = await doc_repo.create(
        patient_id=patient_id,
        document_type="voice_note",
        ingestion_source="crisis_follow_up",
        file_url="",
        file_mime_type="text/plain",
        uploaded_by=current_user.id,
    )
    await conn.execute(
        """UPDATE public.source_documents
           SET extracted_text = $1, extraction_status = 'approved'
           WHERE id = $2""",
        body.response_text, doc.id,
    )

    # Notification audit trail
    await notif_repo.create(
        patient_id=patient_id,
        recipient_user_id=current_user.id,
        type="crisis_follow_up_response",
        channel="in_app",
        title="Emergency follow-up recorded",
        body=body.response_text[:500],
        action_deep_link=f"/patient/{patient_id}/crisis",
    )

    # Acknowledge pending crisis/watch notification
    pending = await notif_repo.get_by_patient_id(patient_id, limit=20)
    acknowledged_id = None
    for n in pending:
        if n.type in ("crisis_follow_up", "watch_event_card") and n.status not in ("read", "failed"):
            await notif_repo.acknowledge(n.id, "handled")
            acknowledged_id = str(n.id)
            break

    return CrisisFollowUpResponse(
        message="Response recorded. Thank you for the update.",
        notification_id=acknowledged_id,
    )
