from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentPatient, CurrentUser, DBConn
from app.schemas.caregiver import CaregiverCreate, CaregiverRemoveResponse, CaregiverResponse
from app.schemas.common import SuccessResponse
from app.services.caregiver_service import CaregiverService

router = APIRouter(prefix="/patients/{patient_id}/caregivers", tags=["caregivers"])


@router.post("", response_model=CaregiverResponse, status_code=201)
async def add_caregiver(
    patient_id: UUID,
    body: CaregiverCreate,
    current_user: CurrentUser,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> CaregiverResponse:
    svc = CaregiverService(conn)
    caregiver = await svc.add(patient_id, current_user.id, body)
    return CaregiverResponse(**caregiver.model_dump())


@router.get("", response_model=list[CaregiverResponse])
async def list_caregivers(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
    active_only: bool = Query(True),
) -> list[CaregiverResponse]:
    svc = CaregiverService(conn)
    caregivers = await svc.list(patient_id, active_only=active_only)
    return [CaregiverResponse(**c.model_dump()) for c in caregivers]


@router.get("/{caregiver_id}", response_model=CaregiverResponse)
async def get_caregiver(
    patient_id: UUID,
    caregiver_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> CaregiverResponse:
    svc = CaregiverService(conn)
    caregiver = await svc.get(patient_id, caregiver_id)
    return CaregiverResponse(**caregiver.model_dump())


@router.delete("/{caregiver_id}", response_model=CaregiverRemoveResponse)
async def remove_caregiver(
    patient_id: UUID,
    caregiver_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> CaregiverRemoveResponse:
    svc = CaregiverService(conn)
    await svc.remove(patient_id, caregiver_id)
    return CaregiverRemoveResponse(
        message="Caregiver removed", caregiver_id=caregiver_id
    )


@router.post("/{caregiver_id}/reinvite", response_model=SuccessResponse)
async def reinvite_caregiver(
    patient_id: UUID,
    caregiver_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> SuccessResponse:
    svc = CaregiverService(conn)
    await svc.reinvite(patient_id, caregiver_id)
    return SuccessResponse(message="Invitation resent via WhatsApp")


@router.put("/{caregiver_id}", response_model=CaregiverResponse)
async def update_caregiver(
    patient_id: UUID,
    caregiver_id: UUID,
    body: CaregiverCreate,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> CaregiverResponse:
    svc = CaregiverService(conn)
    caregiver = await svc.update(patient_id, caregiver_id, body)
    return CaregiverResponse(**caregiver.model_dump())
