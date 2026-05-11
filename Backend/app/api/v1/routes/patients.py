from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, DBConn
from app.schemas.common import SuccessResponse
from app.schemas.patient import PatientCreate, PatientResponse, PatientUpdate
from app.services.patient_service import PatientService

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("", response_model=PatientResponse, status_code=201)
async def create_patient(
    body: PatientCreate,
    current_user: CurrentUser,
    conn: DBConn,
) -> PatientResponse:
    svc = PatientService(conn)
    patient = await svc.create(current_user.id, body)
    return PatientResponse(**patient.model_dump())


@router.get("", response_model=list[PatientResponse])
async def list_patients(current_user: CurrentUser, conn: DBConn) -> list[PatientResponse]:
    svc = PatientService(conn)
    patients = await svc.list_by_user(current_user.id)
    return [PatientResponse(**p.model_dump()) for p in patients]


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: UUID,
    current_user: CurrentUser,
    conn: DBConn,
) -> PatientResponse:
    svc = PatientService(conn)
    patient = await svc.get(patient_id, current_user.id)
    return PatientResponse(**patient.model_dump())


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: UUID,
    body: PatientUpdate,
    current_user: CurrentUser,
    conn: DBConn,
) -> PatientResponse:
    svc = PatientService(conn)
    patient = await svc.update(patient_id, current_user.id, body)
    return PatientResponse(**patient.model_dump())


@router.delete("/{patient_id}", response_model=SuccessResponse)
async def delete_patient(
    patient_id: UUID,
    current_user: CurrentUser,
    conn: DBConn,
) -> SuccessResponse:
    svc = PatientService(conn)
    await svc.delete(patient_id, current_user.id)
    return SuccessResponse(message="Patient deleted")
