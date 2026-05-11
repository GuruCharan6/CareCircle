from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentPatient, CurrentUser, DBConn
from app.schemas.calendar import (
    CalendarEventCreate,
    CalendarEventResponse,
    CalendarEventUpdate,
)
from app.schemas.common import SuccessResponse
from app.services.calendar_service import CalendarService

router = APIRouter(prefix="/patients/{patient_id}/calendar", tags=["calendar"])


@router.post("", response_model=CalendarEventResponse, status_code=201)
async def create_event(
    patient_id: UUID,
    body: CalendarEventCreate,
    current_user: CurrentUser,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> CalendarEventResponse:
    svc = CalendarService(conn)
    event = await svc.create(patient_id, current_user.id, body)
    return CalendarEventResponse(**event.model_dump())


@router.get("", response_model=list[CalendarEventResponse])
async def list_events(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
    within_days: int = Query(30, ge=1, le=365),
    status: str | None = Query(None),
) -> list[CalendarEventResponse]:
    svc = CalendarService(conn)
    events = await svc.list(patient_id, within_days=within_days, status=status)
    return [CalendarEventResponse(**e.model_dump()) for e in events]


@router.get("/{event_id}", response_model=CalendarEventResponse)
async def get_event(
    patient_id: UUID,
    event_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> CalendarEventResponse:
    svc = CalendarService(conn)
    event = await svc.get(patient_id, event_id)
    return CalendarEventResponse(**event.model_dump())


@router.patch("/{event_id}", response_model=CalendarEventResponse)
async def update_event(
    patient_id: UUID,
    event_id: UUID,
    body: CalendarEventUpdate,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> CalendarEventResponse:
    svc = CalendarService(conn)
    event = await svc.update(patient_id, event_id, body)
    return CalendarEventResponse(**event.model_dump())


@router.post("/{event_id}/confirm", response_model=CalendarEventResponse)
async def confirm_event(
    patient_id: UUID,
    event_id: UUID,
    current_user: CurrentUser,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> CalendarEventResponse:
    svc = CalendarService(conn)
    event = await svc.confirm(patient_id, event_id, current_user.id)
    return CalendarEventResponse(**event.model_dump())


@router.delete("/{event_id}", response_model=SuccessResponse)
async def cancel_event(
    patient_id: UUID,
    event_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> SuccessResponse:
    svc = CalendarService(conn)
    await svc.cancel(patient_id, event_id)
    return SuccessResponse(message="Event cancelled")
