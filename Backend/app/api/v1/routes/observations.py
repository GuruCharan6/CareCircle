from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentPatient, DBConn
from app.schemas.observation import ObservationCreate, ObservationResponse
from app.services.observation_service import ObservationService

router = APIRouter(prefix="/patients/{patient_id}/observations", tags=["observations"])


@router.post("", response_model=ObservationResponse, status_code=201)
async def create_observation(
    patient_id: UUID,
    body: ObservationCreate,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> ObservationResponse:
    svc = ObservationService(conn)
    obs = await svc.create(patient_id, body)
    return ObservationResponse(**obs.model_dump())


@router.get("", response_model=list[ObservationResponse])
async def list_observations(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
    source_type: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
) -> list[ObservationResponse]:
    svc = ObservationService(conn)
    observations = await svc.list(patient_id, source_type=source_type, limit=limit)
    return [ObservationResponse(**o.model_dump()) for o in observations]


@router.get("/{obs_id}", response_model=ObservationResponse)
async def get_observation(
    patient_id: UUID,
    obs_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> ObservationResponse:
    svc = ObservationService(conn)
    obs = await svc.get(patient_id, obs_id)
    return ObservationResponse(**obs.model_dump())
