from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentPatient, DBConn
from app.schemas.drug_interaction import DrugInteractionResponse
from app.services.drug_interaction_service import DrugInteractionService

router = APIRouter(
    prefix="/patients/{patient_id}/drug-interactions", tags=["drug_interactions"]
)


@router.get("", response_model=list[DrugInteractionResponse])
async def list_drug_interactions(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> list[DrugInteractionResponse]:
    svc = DrugInteractionService(conn)
    results = await svc.list(patient_id)
    return [DrugInteractionResponse(**r.model_dump()) for r in results]


@router.post("/check", response_model=list[DrugInteractionResponse])
async def trigger_interaction_check(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> list[DrugInteractionResponse]:
    svc = DrugInteractionService(conn)
    results = await svc.trigger_check(patient_id)
    return [DrugInteractionResponse(**r.model_dump()) for r in results]
