from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import CurrentPatient, DBConn
from app.schemas.common import SuccessResponse
from app.schemas.notification import (
    AcknowledgeRequest,
    MarkReadRequest,
    NotificationResponse,
    UnreadCountResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter(
    prefix="/patients/{patient_id}/notifications", tags=["notifications"]
)


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
) -> list[NotificationResponse]:
    svc = NotificationService(conn)
    items = await svc.list(patient_id, status=status, limit=limit)
    return [NotificationResponse(**n.model_dump()) for n in items]


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> UnreadCountResponse:
    svc = NotificationService(conn)
    count = await svc.unread_count(patient_id)
    return UnreadCountResponse(unread_count=count)


@router.post("/mark-read", response_model=SuccessResponse)
async def mark_read(
    patient_id: UUID,
    body: MarkReadRequest,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> SuccessResponse:
    svc = NotificationService(conn)
    count = await svc.mark_read(patient_id, body.notification_ids)
    return SuccessResponse(message=f"{count} notification(s) marked as read")


@router.patch("/{notification_id}/acknowledge", response_model=NotificationResponse)
async def acknowledge_notification(
    patient_id: UUID,
    notification_id: UUID,
    body: AcknowledgeRequest,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> NotificationResponse:
    """
    Explicit user acknowledgement for alert-type notifications.
    action = 'handled' | 'ongoing'
    Marks notification as read. Badge count decrements only on this call.
    """
    if body.action not in ("handled", "ongoing"):
        raise HTTPException(status_code=422, detail="action must be 'handled' or 'ongoing'")
    svc = NotificationService(conn)
    notif = await svc.acknowledge(patient_id, notification_id, body.action)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return NotificationResponse(**notif.model_dump())
