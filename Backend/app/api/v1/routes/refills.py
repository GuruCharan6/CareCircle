from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentPatient, DBConn
from app.schemas.refill import RefillConfirmRequest, RefillCreate, RefillResponse, RefillStatusResponse
from app.services.refill_service import RefillService

router = APIRouter(prefix="/patients/{patient_id}/refills", tags=["refills"])


@router.post("", response_model=RefillResponse, status_code=201)
async def create_refill(
    patient_id: UUID,
    body: RefillCreate,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> RefillResponse:
    svc = RefillService(conn)
    refill = await svc.create(patient_id, body)
    return RefillResponse(**refill.model_dump())


@router.get("/due", response_model=list[RefillStatusResponse])
async def list_due_refills(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
    within_days: int = Query(10, ge=1, le=30),
) -> list[RefillStatusResponse]:
    svc = RefillService(conn)
    return await svc.list_due_soon(patient_id, within_days=within_days)


@router.post("/{refill_id}/confirm", response_model=RefillResponse)
async def confirm_refill(
    patient_id: UUID,
    refill_id: UUID,
    body: RefillConfirmRequest,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> RefillResponse:
    svc = RefillService(conn)
    refill = await svc.confirm(patient_id, refill_id, body)
    return RefillResponse(**refill.model_dump())
