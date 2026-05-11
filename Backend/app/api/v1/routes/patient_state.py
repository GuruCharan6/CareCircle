from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentPatient, DBConn
from app.schemas.patient_state import PatientStateResponse
from app.services.patient_state_service import PatientStateService

router = APIRouter(prefix="/patients/{patient_id}/state", tags=["patient_state"])


@router.get("", response_model=PatientStateResponse)
async def get_patient_state(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> PatientStateResponse:
    svc = PatientStateService(conn)
    return await svc.get(patient_id)
