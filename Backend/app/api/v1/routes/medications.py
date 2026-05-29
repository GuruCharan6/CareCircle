from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentPatient, DBConn
from app.schemas.common import SuccessResponse
from app.schemas.medication import MedicationCreate, MedicationResponse, MedicationUpdate
from app.services.medication_service import MedicationService

router = APIRouter(prefix="/patients/{patient_id}/medications", tags=["medications"])


@router.post("", response_model=MedicationResponse, status_code=201)
async def create_medication(
    patient_id: UUID,
    body: MedicationCreate,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> MedicationResponse:
    svc = MedicationService(conn)
    med = await svc.create(patient_id, body)
    return MedicationResponse(**med.model_dump())


@router.get("", response_model=list[MedicationResponse])
async def list_medications(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
    active_only: bool = Query(False),
) -> list[MedicationResponse]:
    svc = MedicationService(conn)
    meds = await svc.list(patient_id, active_only=active_only)
    return [MedicationResponse(**m.model_dump()) for m in meds]


@router.get("/{medication_id}", response_model=MedicationResponse)
async def get_medication(
    patient_id: UUID,
    medication_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> MedicationResponse:
    svc = MedicationService(conn)
    med = await svc.get(patient_id, medication_id)
    return MedicationResponse(**med.model_dump())


@router.patch("/{medication_id}", response_model=MedicationResponse)
async def update_medication(
    patient_id: UUID,
    medication_id: UUID,
    body: MedicationUpdate,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> MedicationResponse:
    """Update medication details — dose, timing, timing_slots, prescriber link, etc."""
    svc = MedicationService(conn)
    med = await svc.update(patient_id, medication_id, body)
    return MedicationResponse(**med.model_dump())


@router.delete("/{medication_id}", response_model=SuccessResponse)
async def discontinue_medication(
    patient_id: UUID,
    medication_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> SuccessResponse:
    svc = MedicationService(conn)
    await svc.discontinue(patient_id, medication_id)
    return SuccessResponse(message="Medication discontinued")
