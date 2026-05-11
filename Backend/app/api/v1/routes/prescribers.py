from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentPatient, DBConn
from app.schemas.common import SuccessResponse
from app.schemas.prescriber import PrescriberCreate, PrescriberResponse, PrescriberUpdate
from app.services.prescriber_service import PrescriberService

router = APIRouter(prefix="/patients/{patient_id}/prescribers", tags=["prescribers"])


@router.post("", response_model=PrescriberResponse, status_code=201)
async def add_prescriber(
    patient_id: UUID,
    body: PrescriberCreate,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> PrescriberResponse:
    svc = PrescriberService(conn)
    p = await svc.create(patient_id, body)
    return PrescriberResponse(**p.model_dump())


@router.get("", response_model=list[PrescriberResponse])
async def list_prescribers(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
    active_only: bool = Query(False),
) -> list[PrescriberResponse]:
    svc = PrescriberService(conn)
    prescribers = await svc.list(patient_id, active_only=active_only)
    return [PrescriberResponse(**p.model_dump()) for p in prescribers]


@router.get("/{prescriber_id}", response_model=PrescriberResponse)
async def get_prescriber(
    patient_id: UUID,
    prescriber_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> PrescriberResponse:
    svc = PrescriberService(conn)
    p = await svc.get(patient_id, prescriber_id)
    return PrescriberResponse(**p.model_dump())


@router.patch("/{prescriber_id}", response_model=PrescriberResponse)
async def update_prescriber(
    patient_id: UUID,
    prescriber_id: UUID,
    body: PrescriberUpdate,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> PrescriberResponse:
    svc = PrescriberService(conn)
    p = await svc.update(patient_id, prescriber_id, body)
    return PrescriberResponse(**p.model_dump())


@router.post("/{prescriber_id}/deactivate", response_model=SuccessResponse)
async def deactivate_prescriber(
    patient_id: UUID,
    prescriber_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> SuccessResponse:
    """Soft-remove doctor. Their past medications remain in history."""
    svc = PrescriberService(conn)
    await svc.deactivate(patient_id, prescriber_id)
    return SuccessResponse(message="Prescriber deactivated")


@router.post("/{prescriber_id}/reactivate", response_model=SuccessResponse)
async def reactivate_prescriber(
    patient_id: UUID,
    prescriber_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> SuccessResponse:
    svc = PrescriberService(conn)
    await svc.reactivate(patient_id, prescriber_id)
    return SuccessResponse(message="Prescriber reactivated")
