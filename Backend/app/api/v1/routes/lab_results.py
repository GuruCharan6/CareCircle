from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentPatient, DBConn
from app.schemas.lab_result import LabResultCreate, LabResultResponse, LabTrendItem
from app.services.lab_result_service import LabResultService

router = APIRouter(prefix="/patients/{patient_id}/lab-results", tags=["lab_results"])


@router.post("", response_model=LabResultResponse, status_code=201)
async def create_lab_result(
    patient_id: UUID,
    body: LabResultCreate,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> LabResultResponse:
    svc = LabResultService(conn)
    result = await svc.create(patient_id, body)
    return LabResultResponse(**result.model_dump())


@router.get("", response_model=list[LabResultResponse])
async def list_lab_results(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
    limit: int = Query(100, ge=1, le=500),
) -> list[LabResultResponse]:
    svc = LabResultService(conn)
    results = await svc.list(patient_id, limit=limit)
    return [LabResultResponse(**r.model_dump()) for r in results]


@router.get("/trend/{test_name}", response_model=list[LabTrendItem])
async def get_lab_trend(
    patient_id: UUID,
    test_name: str,
    current_patient: CurrentPatient,
    conn: DBConn,
    limit: int = Query(5, ge=1, le=20),
) -> list[LabTrendItem]:
    svc = LabResultService(conn)
    results = await svc.trend(patient_id, test_name, limit=limit)
    return [
        LabTrendItem(
            test_name_display=r.test_name_display,
            test_date=r.test_date,
            value=r.value,
            unit=r.unit,
            is_abnormal=r.is_abnormal,
            delta_from_prev=r.delta_from_prev,
        )
        for r in results
    ]


@router.get("/{result_id}", response_model=LabResultResponse)
async def get_lab_result(
    patient_id: UUID,
    result_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> LabResultResponse:
    svc = LabResultService(conn)
    result = await svc.get(patient_id, result_id)
    return LabResultResponse(**result.model_dump())
